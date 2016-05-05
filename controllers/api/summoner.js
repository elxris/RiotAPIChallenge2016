'use strict';

var Redis = require('ioredis');

module.exports = function(router) {

  router.post('/', function(req, res) {
    var redis = req.redis = new Redis();
    redis.hget('summonernames', req.body.region + ':' + req.body.name).then(
      function(value) {
        if (!value) {
          redis.pipeline()
          .sadd('pending:players', req.body.region + ':' + req.body.name)
          .subscribe('ready:players:' + req.body.name,
            function(err, count) {
              redis.on('ready:players:' + req.body.name, function(val) {
                respond(val);
              });
            }
          ).exec();
        }
        return respond(value);
        function respond(value) {
          var [summonerId, profileIconId] = value.split(':');
          res.send({summonerId: summonerId, profileIconId: profileIconId});
        }
      }
    );
    res.on('close', flushRedis);
    res.on('finish', flushRedis);
    function flushRedis() {
      redis.end();
      delete req.redis;
    }
  });

  router.use(function(err, req, res, next) {
    if (req.redis) {
      req.redis.end();
    }
    res.status(500).end();
  });
};
