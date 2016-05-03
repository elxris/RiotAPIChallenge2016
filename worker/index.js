'use strict';

var app = require('../app');

var api = require('../lib/riotApi');
var Redis   = require('ioredis');
var redis   = new Redis(app.kraken.get('redis'));

module.exports = {
  redis: redis,
  app: app,
  api: api,
  interval: setInterval(function() {
    var pendingPlayers = require('./pendingPlayers');
    pendingPlayers();
  }, 500 / 600 * 1000)
};
