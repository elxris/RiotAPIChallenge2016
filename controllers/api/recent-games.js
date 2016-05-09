'use strict';

var Redis = require('ioredis');

module.exports = function(router) {

  router.post('/', function(req, res) {
    var positions = req.app.kraken.get('positions');
    var roles = req.app.kraken.get('roles');
    var redis = req.redis = new Redis();
    var _tier;
    redis.pipeline()
         .hget('cached:leagues', function(err, data) {
           data = data || '';
           var [, tier, date] = data.split(/(.+):/);
           _tier = tier;
         })
         .hget('cached:recentGames',
               req.body.region + ':' + req.body.e,
               function(err, data) {
                 data = data || '';
                 var [, games, time] = data.split(/(.+):/);
                 if (!games || (Date.now() - time) > 1000 * 60 * 15) {
                   return redis.sadd('pending:summoners',
                                     req.body.region + ':' + req.body.summoner)
                                .then(function() {
                                  redis.subscribe(
                                    'ready:recentGames:' +
                                    req.body.region + ':' +
                                    req.body.summoner,
                                    function(err, count) {
                                      redis.on('message', function(ch, val) {
                                        if (!val || val === 'false') {
                                          return res.status(404).end();
                                        }
                                        getScores(val);
                                      });
                                    }
                                  );
                                });
                 }
                 getScores(games);
               }
             )
         .exec();
    res.on('close', flushRedis);
    res.on('finish', flushRedis);
    function flushRedis() {
      redis.end();
      delete req.redis;
    }
    function getScores(games) {
      _tier = _tier || 'UNRANKED';
      games = JSON.parse(games);
      var cards = redis.pipeline();
      var scores = redis.pipeline();
      games.forEach(function(game) {
        if (!game.valid) {
          return;
        }
        var data = [
          ['damageDealt', game.stats.totalDamageDealtToChampions],
          ['damageTaken', game.stats.totalDamageTaken],
          ['gold', game.stats.goldEarned / game.stats.timePlayed],
          ['minionsKilled', game.stats.minionsKilled / game.stats.timePlayed],
          ['wardsPlaced', game.stats.wardsPlaced / game.stats.timePlayed],
          ['kills', game.stats.kills],
          ['deaths', game.stats.deaths],
          ['assists', game.stats.assists]
        ];
        game.keyStats = {};
        data.forEach(function(keys) {
          var [key, value] = keys;
          var index = ['data', _tier, positions[game.stats.playerPosition],
                      roles[game.stats.playerRole || 0], key].join(':');
          cards = cards.zcard(index, function(err, zcard) {
            if (zcard) {
              var min = Math.floor(zcard * 0.1);
              var max = Math.ceil(zcard * 0.9);
              scores = scores.zrange(index, min, min + 1, 'WITHSCORES',
                function(err, data) {
                  game.keyStats.min = data[1];
                }
              );
              scores = scores.zrange(index, max, max + 1, 'WITHSCORES',
                function(err, data) {
                  game.keyStats.max = data[1];
                  game.keyStats.actual = Math.min(100, value / data[1] * 100);
                }
              );
            }
          });
          cards = cards.zcard(index + ':' + game.championId,
            function(err, zcard) {
              if (zcard) {
                var min = Math.floor(zcard * 0.1);
                var max = Math.ceil(zcard * 0.9);
                scores = scores.zrange(index, min, min + 1, 'WITHSCORES',
                  function(err, data) {
                    game.keyStats.min = data[1];
                  }
                );
                scores = scores.zrange(index, max, max + 1, 'WITHSCORES',
                  function(err, data) {
                    game.keyStats.max = data[1];
                    game.keyStats.actual = Math.min(100, value / data[1] * 100);
                  }
                );
              }
            }
          );
        });
      });
      cards.exec().then(function() {
        return scores.exec();
      }).then(function() {
        res.json(games);
      });
    }
  });

  router.use(function(err, req, res, next) {
    if (req.redis) {
      req.redis.end();
    }
    res.status(500).end();
  });
};
