'use strict';

var {app, redis, api} = require('./.');

var pendingSummoners = require('./pendingSummoners');
var addPlayer = require('./lib/addPlayer');

module.exports = function() {
  return redis.pipeline()
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players')
    .spop('pending:players').exec()
  .then(function(values) {
    var count = 0;
    var players = {};
    values.forEach(function([err, val]) {
      if (err) {
        console.error(err);
      }
      if (val) {
        count++;
        var [region, name] = val.split(':');
        (players[region] = players[region] || []).push(name);
      }
    });
    if (count === 0) {
      return pendingSummoners();
    }
    Object.keys(players).forEach(function(region) {
      var _players = players[region].join(',');
      if (_players.length) {
        api.summoner(region, _players).then(function(players) {
          Object.keys(players).forEach(function(name) {
            redis.hsetnx('summonernames', region + ':' + name, players[name].id);
            redis.exists('cached:' + region + ':' + players[name].id + ':games')
            .then(function(exist) {
              if (!exist) {
                redis.sadd('pending:summoners', region + ':' +
                  players[name].id);
              }
            });
          });
        });
      }
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
