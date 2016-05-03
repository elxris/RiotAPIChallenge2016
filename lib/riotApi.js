'use strict';

var app = require('../app');

var P       = require('bluebird');
var request = P.promisifyAll(require('request'));
var defaults = app.kraken.get('requestDefaults');
console.log('request defaults', defaults);
request.defaults(defaults);
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
        uri: uri
      });
    },
    featured: function(region) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/observer-mode/rest/featured'
      });
    },
    recent: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.3/game/' +
          'by-summoner/' + player + '/recent'
      });
    },
    summary: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.3/stats/' +
          'by-summoner/' + player + '/summary'
      });
    },
    summoner: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v1.4/summoner/by-name/' + player
      });
    },
    match: function(region, match) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v2.2/match/' + match,
        qs: {'includeTimeline': true}
      });
    },
    league: function(region, player) {
      return request.getAsync({
        baseUrl: 'https://' + region + _url,
        uri: '/api/lol/' + region + '/v2.5/league/by-summoner/' + player
      });
    }
  };
  return API;
})();
