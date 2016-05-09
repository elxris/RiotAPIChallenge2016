'use strict';

var _Promise = require('bluebird');
var {app, redis, api} = require('./.');
var background = require('./background');

var addData = function(
  commands,
  region, matchId, league, lane,
  role, key, score, champ, vsChamp
) {
  if (vsChamp) {
    commands = commands.zadd(
      ['data', league, lane, role, key, champ, 'vs', vsChamp].join(':'),
      score, region + ':' + matchId
    );
  }
  if (champ) {
    commands = commands.zadd(
      ['data', league, lane, role, key, champ].join(':'),
      score, region + ':' + matchId
    );
  }
  commands = commands.zadd(
    ['data', league, lane, role, key].join(':'),
    score, region + ':' + matchId
  );
  return commands;
};

module.exports = function() {
  return redis.spop('pending:games')
  .then(function(value) {
    if (!value) {
      return background();
    }
    var [, region, matchId] = value.split(/(.+):/);
    return api.match(region, matchId)
    .then(function({body:game}) {
      var commands = redis.pipeline();
      var promises = [];
      game.participants.forEach(function(player) {
        var promise;
        if (game.participantIdentities[0].player) { //Has summonerId
          var {summonerId} = (game.participantIdentities.find(
            function(id) {
              return id.participantId === player.participantId;
            }
          ) || {}).player;
          promise = redis.hget('cached:league', region + ':' + summonerId)
          .then(function(value) {
            value = value || '';
            var [, league, date] = value.split(/(.+):/);
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
          var data = [
            ['damageDealt', player.stats.totalDamageDealtToChampions],
            ['damageTaken', player.stats.totalDamageTaken],
            ['gold', player.stats.goldEarned / game.matchDuration],
            ['minionsKilled', player.stats.minionsKilled / game.matchDuration],
            ['wardsPlaced', player.stats.wardsPlaced / game.matchDuration],
            ['kills', player.stats.kills],
            ['deaths', player.stats.deaths],
            ['assists', player.stats.assists]
          ];
          data.forEach(function([key, score]) {
            commands = addData(commands, region, matchId, league,
              player.timeline.lane, player.timeline.role,
              key, score,
              player.championId, vs.championId);
          });
        });
        promises.push(promise);
      });
      return _Promise.all(promises).then(function() {
        return commands.exec();
      });
    })
    .catch(function(err) {
      if (err.statusCode !== 404 && err.statusCode !== 400) {
        redis.sadd('pending:games', value);
      }
      console.error(err.body || err);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
