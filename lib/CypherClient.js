var _ = require('underscore');
var request = require('request');
var format = require('util').format;
var NeoHttpClient = require('./NeoHttpClient');

module.exports = CypherClient;

function CypherClient ( hostOrConnOpts, clientOpts ) {
  
  var self = this ;
  var httpOpts = self._httpOpts = _.isString(hostOrConnOpts) ? { host : hostOrConnOpts } : hostOrConnOpts || {} ;
  var clientOpts = self._clientOpts = clientOpts || {} ;
  
  _.defaults(httpOpts,{
    host : 'http://localhost:7474',
    base : '/db/data',
    cypher : '/cypher',
    batch : '/batch'
  });
  
  _.defaults(clientOpts||{},{
    concurrency : Infinity,
    batchMax : 1
  });
  
  self._neoClient = new NeoHttpClient(httpOpts);
  self._queue = [];
  self._running = 0 ;
  
}


CypherClient.prototype.query = function ( query, params, cb ) {
  var self = this;
  self._queue.push({
    query: query||null,
    params: params||{},
    cb: cb || function () {}
  });
  self._flushQueue();
};

CypherClient.prototype.multi = function (reqs) {
  var self = this ;
  return self._neoClient.multi(reqs);
}

CypherClient.prototype._flushQueue = function() {
  var self = this;
  if ( self._running > self._clientOpts.concurrency || !self._queue.length) {
    return;
  } else {
    self._running+=1;
  }
  
  var multi = self._neoClient.multi(self._queue.splice(0, self._clientOpts.batchMax))
  
  multi.exec(function(){
    self._running-=1 ;
    self._flushQueue();
  });
  
};