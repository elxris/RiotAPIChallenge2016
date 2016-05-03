'use strict';

var {app, redis, api} = require('./.');
var pendingSummoners = require('./pendingSummoners');

module.exports = function() {
  return redis.srandmember('summoners')
  .then(function(value) {
    if (!value) {
      console.log('No hay datos con los que trabajar.');
      return;
    }
    console.log('Re-añadiendo elementos a la lista.');
    return redis.sadd('pending:summoners', value).then(function() {
      return pendingSummoners();
    });
  })
  .catch(function(err) {
    console.error(err);
  });
};
