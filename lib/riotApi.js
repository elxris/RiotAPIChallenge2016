'use strict';

var app = require('../app');

var P       = require('bluebird');
var request = P.promisifyAll(require('request'));
var riotApiKey = app.kraken.get('riotApiKey');
console.log('riotApiKey', riotApiKey);
require('request-debug')(request);

var _url    = app.kraken.get('baseRiotUrl');
var _pla    = app.kraken.get('platform');

var errorThrow = function(response) {
  if (response.statusCode !== 200) {
    throw response;
  }
  return response;
};

module.exports = (function() {
  var API = {
    mastery: function(region, player, champion) {
      var uri = '/championmastery/location/' + _pla[region].toLowerCase() +
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
      }).then(errorThrow);
    },
    featured: function(region) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/observer-mode/rest/featured',
        qs: {'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    },
    recent: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region.toLowerCase() + '/v1.3/game/' +
          'by-summoner/' + player + '/recent',
        qs: {'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    },
    summary: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region.toLowerCase() + '/v1.3/stats/by-summoner/' +
          player + '/summary',
        qs: {'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    },
    summoner: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region.toLowerCase() +
          '/v1.4/summoner/by-name/' + player,
        qs: {'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    },
    match: function(region, match) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region.toLowerCase() + '/v2.2/match/' + match,
        qs: {'includeTimeline': true, 'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    },
    league: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region.toLowerCase() + '/v2.5/league/by-summoner/' +
          player,
        qs: {'api_key': riotApiKey},
        json: true
      }).then(errorThrow);
    }
  };
  return API;
})();
