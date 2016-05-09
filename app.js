'use strict';

var express = require('express');
var kraken = require('kraken-js');
var P       = require('bluebird');
var request = P.promisifyAll(require('request'));
require('request-debug')(request);

var options; var app;

/*
 * Create and configure application. Also exports application instance for use by tests.
 * See https://github.com/krakenjs/kraken-js#options for additional configuration options.
 */
options = {
  onconfig: function(config, next) {
    /*
     * Add any additional config setup or overrides here. `config` is an initialized
     * `confit` (https://github.com/krakenjs/confit/) configuration object.
     */

    request.getAsync(
      {
        url: 'https://ddragon.leagueoflegends.com/api/versions.json',
        json: true
      }
    ).then(function({body:[version]}) {
      return request.getAsync(
        {
          url: 'http://ddragon.leagueoflegends.com/cdn/' +
            version + '/data/en_US/champion.json',
          json: true
        }
      );
    }).then(function({body:{data:champions}}) {
      var extract = {};
      for (var name in champions) {
        var champion = champions[name];
        extract[champion.key] = {name: champion.name, id: champion.id,
          tags: champion.tags};
      }
      config.set('champions', extract);
      next(null, config);
    }).catch(next);
  }
};

app = module.exports = express();
app.use(kraken(options));
app.on('start', function() {
  console.log('Application ready to serve requests.');
  console.log('Environment: %s', app.kraken.get('env:env'));
});
