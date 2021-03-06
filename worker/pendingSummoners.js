'use strict';

var {app, redis, api} = require('./.');

var pendingLeague = require('./pendingLeague');
var addPlayer = function(region, summoner, pipeline) {
  return pipeline.sadd('summoners', region + ':' + summoner)
                 .hget('cached:league', region + ':' + summoner,
                      function(err, league) {
                        if (err) { throw err; }
                        league = league || '';
                        var [, tier, time] = league.split(/(.+):/);
                        if (!league || (Date.now() - time) > 1000 * 60 * 60) {
                          redis.sadd('pending:league', region + ':' + summoner);
                        }
                      }
                 );
};

module.exports = function() {
  return redis.spop('pending:summoners')
  .then(function(value) {
    if (!value) {
      // TODO pendingSummonerLeagues
      return pendingLeague();
    }
    var [, region, summoner] = value.split(/(.+):/);
    return api.recent(region, summoner).then(function({body:{games:games}}) {
      var gamesCache = [];
      games.forEach(function(game) {
        var extract = {
          gameId: game.gameId,
          team: game.teamId,
          championId: game.championId,
          stats: game.stats,
          valid: false
        };
        if (
          game.gameMode === 'CLASSIC' && game.gameType === 'MATCHED_GAME' &&
          ['NORMAL', 'RANKED_SOLO_5x5', 'RANKED_PREMADE_5x5', 'RANKED_TEAM_5x5',
          'CAP_5x5'].indexOf(game.subType) >= 0
        ) {
          redis.sadd('games', region + ':' + game.gameId)
          .then(function(count) {
            if (count) {
              var commands = redis.pipeline();
              commands = addPlayer(region, summoner, commands);
              game.fellowPlayers.forEach(function(player) {
                commands = addPlayer(region, player.summonerId, commands);
              });
              commands.sadd('pending:games', region + ':' + game.gameId)
                      .exec();
            }
          });
          extract.valid = true;
        }
        gamesCache.push(extract);
      });
      redis.pipeline()
           .hset('cached:recentGames', value,
                 JSON.stringify(gamesCache) + ':' + Date.now())
           .publish('ready:recentGames:' + value, JSON.stringify(gamesCache))
           .exec();
    }).catch(function(err) {
      if (err.statusCode !== 404 && err.statusCode !== 400) {
        redis.sadd('pending:summoners', value);
      } else {
        redis.publish('ready:recentGames:' + value, 'false');
      }
      console.error(err.body || err);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
