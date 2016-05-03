'use strict';

var app = require('../app');

var P       = require('bluebird');
var request = P.promisifyAll(require('request'));
var riotApiKey = app.kraken.get('riotApiKey');
console.log('riotApiKey', riotApiKey);
require('request-debug')(request);

var _url    = app.kraken.get('baseRiotUrl');
var _pla    = app.kraken.get('platform');

module.exports = (function() {
  var API = {
    mastery: function(region, player, champion) {
      var uri = '/championmastery/location/' + _pla[region] +
                '/player/' + player;
      if (!champion) {
        uri += '/champions';
      } else {
        uri += '/champion/' + champion;
      }
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: uri,
        qs: {'api_key': riotApiKey},
        json: true
      });
    },
    featured: function(region) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/observer-mode/rest/featured',
        qs: {'api_key': riotApiKey},
        json: true
      });
    },
    recent: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.3/game/' +
          'by-summoner/' + player + '/recent',
        qs: {'api_key': riotApiKey},
        json: true
      });
    },
    summary: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.3/stats/' +
          'by-summoner/' + player + '/summary',
        qs: {'api_key': riotApiKey},
        json: true
      });
    },
    summoner: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.4/summoner/by-name/' + player,
        qs: {'api_key': riotApiKey},
        json: true
      });
    },
    match: function(region, match) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v2.2/match/' + match,
        qs: {'includeTimeline': true, 'api_key': riotApiKey},
        json: true
      });
    },
    league: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v2.5/league/by-summoner/' + player,
        qs: {'api_key': riotApiKey},
        json: true
      });
    }
  };
  return API;
})();
