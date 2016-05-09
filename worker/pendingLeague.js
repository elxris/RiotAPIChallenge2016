'use strict';

var {app, redis, api} = require('./.');

var pendingGames = require('./pendingGames');

module.exports = function() {
  return redis.spop('pending:league')
  .then(function(value) {
    if (!value) {
      // TODO pendingSummonerLeagues
      return pendingGames();
    }
    var [region, summoner] = value.split(':');
    return api.league(region, summoner).then(function({body:result}) {
      var leagues = result[summoner];
      var commands = redis.pipeline();
      leagues.forEach(function(league) {
        if (league.queue === 'RANKED_SOLO_5x5') {
          league.entries.forEach(function(player) {
            commands = commands.hset('cached:league',
                                     region + ':' + player.playerOrTeamId,
                                     league.tier + ':' + Date.now());
            commands = commands.sadd('summoners',
                                     region + ':' + player.playerOrTeamId);
            commands = commands.srem('pending:league',
                                     region + ':' + player.playerOrTeamId);
          });
        }
      });
      commands.exec();
    }).catch(function(err) {
      if (err.statusCode !== 404 && err.statusCode !== 400) {
        redis.sadd('pending:league', value);
      } else {
        redis.hset('cached:league', value, 'UNRANKED:' + Date.now());
      }
      console.error(err.body);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
