'use strict';

var Redis = require('ioredis');

module.exports = function(router) {

  router.post('/', function(req, res) {
    var positions = req.app.kraken.get('positions');
    var roles = req.app.kraken.get('roles');
    var redis = req.redis = new Redis();
    redis.hget('cached:recentGames',
               req.body.region + ':' + req.body.e)
         .then(function(data) {
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
                                  res.json(val);
                                });
                              }
                            );
                          });
            }
            res.json(games);
          }
        );
    res.on('close', flushRedis);
    res.on('finish', flushRedis);
    function flushRedis() {
      redis.end();
      delete req.redis;
    }
    function getScores(games) {
      games = JSON.parse(games);
      var cards = redis.pipeline();
      var scores = redis.pipeline();
      games.forEach(function(game) {
        cards.zcard('data:');
      });
      redis.exec().then(function() {
        return scores.exec();
      }).then(function() {
        res.json();
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
