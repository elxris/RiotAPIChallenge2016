'use strict';

module.exports = function(router) {
  router.get('/', function(req, res) {
    res.render('.', {
      champions: req.app.kraken.get('champions')
    });
  });
};
