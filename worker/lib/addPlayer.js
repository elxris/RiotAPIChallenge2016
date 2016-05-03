'use strict';

var {app, redis, api} = require('../.');

module.exports = function(region, player, toLeague) {
  var promise = redis.sadd('summoners', region + ':' + player);
  if (toLeague) {
    promise = redis.exists('cached:' + region + ':' + player + ':league').then(
      function(exist) {
        if (!exist) {
          return redis.sadd('pending:league', region + ':' + player);
        }
      }
    );
  }
  return promise;
};
