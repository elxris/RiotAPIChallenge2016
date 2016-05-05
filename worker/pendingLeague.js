'use strict';

var {app, redis, api} = require('./.');

var pendingGames = require('./pendingGames');
var addPlayer = require('./lib/addPlayer');

module.exports = function() {
  return redis.spop('pending:league')
  .then(function(value) {
    if (!value) {
      // TODO pendingSummonerLeagues
      return pendingGames();
    }
    var [region, summoner] = value.split(':');
    console.log('Getting leagues ' + region + ' of ' + summoner);
    return api.league(region, summoner).then(function({body:result}) {
      var leagues = result[summoner];
      leagues.forEach(function(league) {
        if (league.queue === 'RANKED_SOLO_5x5') {
          league.entries.forEach(function(player) {
            redis.set('cached:' + region + ':' + player.playerOrTeamId +
              ':league', league.tier, 'EX', /*2 days*/ 172800);
            addPlayer(region, player.playerOrTeamId, /*toLeague?*/ false);
            redis.srem('pending:league', region + ':' + player.playerOrTeamId);
          });
        }
      });
    }).catch(function(err) {
      if (err.statusCode !== 404 || err.statusCode !== 400) {
        redis.sadd('pending:league', value);
      } else {
        redis.set('cached:' + value + ':league',
          'UNRANKED', 'EX', /*2 days*/ 172800);
      }
      console.error(err.body);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
