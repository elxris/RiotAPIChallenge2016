'use strict';

var Redis = require('ioredis');

module.exports = function(router) {
  var tiers = {
    'UNRANKED': 'BRONZE',
    'BRONZE': 'SILVER',
    'SILVER': 'GOLD',
    'GOLD': 'PLATINUM',
    'PLATINUM': 'DIAMOND',
    'DIAMOND': 'MASTER',
    'MASTER': 'CHALLENGER',
    'CHALLENGER': 'CHALLENGER'
  };
  router.post('/', function(req, res, next) {
    var positions = req.app.kraken.get('positions');
    var roles = req.app.kraken.get('roles');
    var redis = req.redis = new Redis();
    var _tier;
    redis.pipeline()
         .hget('cached:league', req.body.region + ':' + req.body.summoner,
               function(err, data) {
                 data = data || '';
                 var [, tier, date] = data.split(/(.+):/);
                 _tier = tier;
               })
         .hget('cached:recentGames',
               req.body.region + ':' + req.body.summoner,
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
      var _cards = new Redis();
      var _scores = new Redis();
      var cards = _cards.pipeline();
      var scores = _scores.pipeline();
      games.forEach(function(game) {
        if (!game.valid) {
          return;
        }
        var data = [
          ['damageDealt', game.stats.totalDamageDealtToChampions],
          ['damageTaken', game.stats.totalDamageTaken],
          ['gold', game.stats.goldEarned / game.stats.timePlayed],
          ['minionsKilled', game.stats.minionsKilled / game.stats.timePlayed],
          ['wardsPlaced', game.stats.wardPlaced / game.stats.timePlayed],
          ['kills', game.stats.championsKilled],
          ['deaths', game.stats.numDeaths],
          ['assists', game.stats.assists]
        ];
        game.keyStats = {};
        data.forEach(function(keys) {
          var [key, value] = keys;
          var keyStats = game.keyStats[key] = {all: {}, champ: {}};
          keyStats.champ.actual = value || 0;
          keyStats.all.actual = value || 0;
          var index = ['data', _tier, positions[game.stats.playerPosition],
                      roles[game.stats.playerRole || 0], key].join(':');
          var compl = ['data', tiers[_tier],
                       positions[game.stats.playerPosition],
                       roles[game.stats.playerRole || 0], key].join(':');
          cards = cards.zcard(index, function(err, zcard) {
            if (zcard) {
              var median = Math.floor(zcard * 0.1);
              scores = scores.zrange(index, median, median + 1, 'WITHSCORES',
                function(err, data) {
                  keyStats.all.min = data[1];
                }
              );
            }
          });
          cards = cards.zcard(compl, function(err, zcard) {
            if (zcard) {
              var median = Math.floor(zcard * 0.5);
              scores = scores.zrange(compl, median, median + 1, 'WITHSCORES',
                function(err, data) {
                  keyStats.all.max = data[1];
                }
              );
            }
          });
          cards = cards.zcard(index + ':' + game.championId,
            function(err, zcard) {
              if (zcard) {
                var median = Math.floor(zcard * 0.1);
                scores = scores.zrange(index + ':' + game.championId,
                                       median, median + 1, 'WITHSCORES',
                  function(err, data) {
                    keyStats.champ.min = data[1];
                  }
                );
              }
            }
          );
          cards = cards.zcard(compl + ':' + game.championId,
            function(err, zcard) {
              if (zcard) {
                var median = Math.floor(zcard * 0.5);
                scores = scores.zrange(compl + ':' + game.championId,
                                       median, median + 1, 'WITHSCORES',
                  function(err, data) {
                    keyStats.champ.max = data[1];
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
      }).catch(function(err) {
        console.error(err);
      }).finally(function() {
        _cards.end();
        _scores.end();
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
