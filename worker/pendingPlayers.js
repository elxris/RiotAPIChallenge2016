'use strict';

var {app, redis, api} = require('./.');

var pendingSummoners = require('./pendingSummoners');

module.exports = function() {
  return redis.spop('pending:players')
  .then(function(player) {
    if (!player) {
      return pendingSummoners();
    }
    var [, region, name] = player.split(/(.+):/);
    return api.summoner(region, name).then(function({body:players}) {
      var _player = players[Object.keys(players)[0]];
      redis.pipeline()
      .publish('ready:players:' + player,
               _player.id + ':' + _player.profileIconId)
      .hset('cached:basicData', player,
            _player.id + ':' + _player.profileIconId + ':' + Date.now()
      )
      .hget('cached:recentGames', region + ':' + _player.id,
            function(err, data) {
              if (data) {
                var [, games, date] = data.split(/(.+):/);
                if (Date.now() - date > 1000 * 60 * 15) {
                  redis.sadd('pending:summoners', region + ':' + _player.id);
                }
              } else {
                redis.sadd('pending:summoners', region + ':' + _player.id);
              }
            }
      )
      .exec();
    }).catch(function(err) {
      if (err.statusCode !== 404 && err.statusCode !== 400) {
        redis.sadd('pending:players', player);
      }
      redis.publish('ready:players:' + player, 'false');
      console.error(err.body || err);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
