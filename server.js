'use strict';

var app = require('./app');
var http = require('http');

var server;

/*
 * Create and start HTTP server.
 */

server = http.createServer(app);
server.listen(process.env.PORT || 8000);
server.on('listening', function() {
  console.log('Server listening on http://localhost:%d', this.address().port);
});
app.on('start', function() {
  if (!process.env.NOFARM) {
    var worker = require('./worker');
  }
});
