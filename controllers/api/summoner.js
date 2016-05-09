'use strict';

var Redis = require('ioredis');

module.exports = function(router) {

  router.post('/', function(req, res) {
    var redis = req.redis = new Redis();
    redis.hget('cached:basicData', req.body.region + ':' + req.body.name).then(
      function(value) {
        value = value || '';
        var [, playerData, date] = value.split(/(.+):/);
        if (!value || (Date.now() - date) > 1000 * 60 * 30) {
          redis.sadd('pending:players', req.body.region + ':' + req.body.name);
          redis.subscribe(
            'ready:players:' + req.body.region + ':' +  req.body.name,
            function(err, count) {
              redis.on('message', function(ch, val) {
                if (!val || val === 'false') {
                  return res.status(404).end();
                }
                getLeagueAndRespond(val);
              });
            }
          );
        }
        return getLeagueAndRespond(playerData);
      }
    );
    function getLeagueAndRespond(value) {
      redis.end();
      redis = req.redis = new Redis();

      var [, summonerId, profileIconId] = value.split(/(.+):/);
      redis.hget('cached:league', req.body.region + ':' + summonerId).then(
        function(val) {
          val = val || '';
          var [, league, date] = val.split(/(.+):/);
          if (!val || (Date.now() - date) > 1000 * 60 * 60) {
            redis.sadd('pending:league', req.body.region + ':' + summonerId);
            return redis.subscribe(
              'ready:league:' + req.body.region + ':' + summonerId,
              function(err, count) {
                redis.on('message', function(ch, val) {
                  if (ch !== 'ready:league:' + req.body.region + ':' + summonerId) {
                    return;
                  }
                  if (!val || val === 'false') {
                    return res.status(404).end();
                  }
                  respond(summonerId, profileIconId, val);
                });
              });
          }
          respond(summonerId, profileIconId, league);
        }
      );

      function respond(summonerId, profileIconId, league) {
        res.json({summonerId: summonerId,
                  profileIconId: profileIconId,
                  league: league});
      }
    }
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
