'use strict';

var {app, redis, api} = require('./.');

var pendingLeague = require('./pendingLeague');
var addPlayer = require('./lib/addPlayer');

module.exports = function() {
  return redis.spop('pending:summoners')
  .then(function(value) {
    if (!value) {
      // TODO pendingSummonerLeagues
      return pendingLeague();
    }
    var [region, summoner] = value.split(':');
    console.log('Getting games on ' + region + ' for ' + summoner);
    return api.recent(region, summoner).then(function({body:result}) {
      result.games.forEach(function(value) {
        if (
          value.gameMode === 'CLASSIC' && value.gameType === 'MATCHED_GAME' &&
          ['NORMAL', 'RANKED_SOLO_5x5', 'RANKED_PREMADE_5x5', 'RANKED_TEAM_5x5',
          'CAP_5x5'].indexOf(value.subType) >= 0
        ) {
          redis.sadd('games', region + ':' + value.gameId)
          .then(function(count) {
            if (count) {
              value.fellowPlayers.forEach(function(player) {
                addPlayer(region, player.summonerId, /*toLeague?*/ true);
              });
              redis.sadd('pending:games', region + ':' + value.gameId);
            }
          });
        }
      });
      redis.set('cached:' + region + ':' + summoner + ':games', '1',
        'EX', /*30 minutes*/ 1800);
    }).catch(function(err) {
      if (err.statusCode !== 404 || err.statusCode !== 400) {
        redis.sadd('pending:summoners', value);
      }
      console.error(err.body);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
