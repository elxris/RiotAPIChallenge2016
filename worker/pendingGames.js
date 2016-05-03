'use strict';

var _Promise = require('bluebird');
var {app, redis, api} = require('./.');
var background = require('./background');

var addData = function(
  region, matchId, league, lane,
  role, key, score, champ, vsChamp
) {
  if (vsChamp) {
    champ = Math.min(champ, vsChamp);
    vsChamp = Math.max(champ, vsChamp);
    redis.zadd(
      ['data', league, lane, role, key, champ, 'vs', vsChamp].join(':'),
      score, region + ':' + matchId
    );
  }
  if (champ) {
    redis.zadd(
      ['data', league, lane, role, key, champ].join(':'),
      score, region + ':' + matchId
    );
  }
  redis.zadd(
    ['data', league, lane, role, key].join(':'),
    score, region + ':' + matchId
  );
};

module.exports = function() {
  return redis.spop('pending:games')
  .then(function(value) {
    if (!value) {
      return background();
    }
    var [region, matchId] = value.split(':');
    return api.match(region, matchId)
    .then(function({body:game}) {
      game.participants.forEach(function(player) {
        var promise;
        if (game.participantIdentities[0].player) { //Has summonerId
          var {summonerId} = (game.participantIdentities.find(
            function(id) {
              return id.participantId === player.participantId;
            }
          ) || {}).player;
          promise = redis.get('cached:' + region + ':' + summonerId + ':league')
          .then(function(league) {
            return league;
          });
        } else {
          promise = _Promise.resolve('');
        }
        promise.then(function(league) {
          league = league || player.highestAchievedSeasonTier;
          var vs = (game.participants.find(function(p) {
            return (p.teamId != player.teamId) &&
                    (p.timeline.line === player.timeline.line) &&
                    (p.timeline.role === player.timeline.role);
          })) || {};
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'damageDealt', player.stats.totalDamageDealtToChampions,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'damageTaken', player.stats.totalDamageTaken,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'gold', player.stats.goldEarned / game.matchDuration,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'minionsKilled', player.stats.minionsKilled / game.matchDuration,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'wardsPlaced', player.stats.wardsPlaced / game.matchDuration,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'kills', player.stats.kills,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'deaths', player.stats.deaths,
            player.championId, vs.championId);
          addData(region, matchId, league,
            player.timeline.lane, player.timeline.role,
            'assists', player.stats.assists,
            player.championId, vs.championId);
        });
      });
    })
    .catch(function(err) {
      if (err.statusCode !== 404) {
        redis.sadd('pending:games', value);
      }
      console.error(err.body);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
