var _ = require('underscore');
var request = require('request');
var format = require('util').format;

module.exports = NeoHttpClient;

function NeoHttpClient (opts) {
  var self = this ;
  self._opts = opts ;
}

NeoHttpClient.prototype.query = function ( query , params , cb ) {
  
  var self = this ;
  var opts = self._opts ;
  var url = opts.host + opts.base + opts.cypher ;
  request.post({
    url : url,
    json : { query : query, params: params },
    headers : {
      "Accept" :  "application/json; charset=UTF-8",
      "X-Stream" : "true"
    }
  },function onBasicQueryResponse (httpError, response, body) {
    
    var err = null ;
    var res = null ;
    
    if ( httpError ) {
      err = httpError ;
    } else if ( response.statusCode > 204 ) {
      err = new NeoError( response.statusCode, body ) ;
    } else {
      res = body ;
    }
    cb(err,res);
    
  });
  
};


NeoHttpClient.prototype.multi = function (reqs) {
  var self = this ;
  var multi = new Multi(self,reqs);
  return multi;
}

NeoHttpClient.prototype.queryBatch = function ( arr, cb ) {
  
  var self = this ;
  var opts = self._opts ;
  var url = opts.host + opts.base + opts.batch ;
  request.post({
    url : url,
    json : (arr||[]).map(function(queryItem){
      return {
        "method" : "POST",
        "to" : opts.cypher,
        "body" : queryItem
      }
    }),
    headers : {
      "Accept" :  "application/json; charset=UTF-8",
      "X-Stream" : "true"
    }
  },function onBatchQueryResponse (httpError, response, body) {
  
    var err = null ;
    var res = null ;
  
    if ( httpError ) {
      err = httpError ;
    } else if ( response.statusCode > 204 ) {
      err = new NeoError( response.statusCode, body ) ;
    } else {
      res = body ;
    }
    cb(err,res);
  
  });
    
};

function Multi (client, reqs) {
  this._client = client;
  this._requests = _.isArray(reqs) ? reqs : [];
};

Multi.prototype.query = function (query, params, cb) {
  this._requests.push({ query : query, params: params, cb : cb||function(){} })
};

Multi.prototype.run = function (cb) {
  var self = this ;
  var client = self._client;
  var pending = self._requests;
  var done = cb || function(){};
  function runIteration () {
    if (pending.length==0){
      return setImmediate(done,null);
    } else if (pending.length==1){
      var item = pending.pop();
      client.query(item.query,item.params,item.cb);
      return setImmediate(done,null);
    } else {
      client.queryBatch(pending,function(err,results){
        if ( err ) {
          pending.forEach(function(item){
            setImmediate(item.cb,err)
          });
          setImmediate(done,err);
          return false;
        }
        
        var wasFailedRequest = results.some(function(item,index){
          if (item.status > 204) {
            var itemThatFailed = pending.splice(index,1)[0];
            var err = new NeoError(item.status,item.body);
            setImmediate(itemThatFailed.cb,err);
            return true;
          }
          return false;
        });
        
        if ( wasFailedRequest ) {
          // every time a failing item is removed from the batch, reverse 
          // the local "pending" queue. We want to continuously remove 
          // failable items from the tail, This gives errors at the tail
          // a chance to fail early without forcing neo to reverse a large txn.
          pending.reverse();
          setImmediate(runIteration);
        } else {
          results.forEach(function(item,index){
            var itemThatSucceeded = pending[index];
            setImmediate(itemThatSucceeded.cb,null,item.body);
          });
          setImmediate(done,null);
        }
        
      })
    }
  }
  setImmediate(runIteration)
};

function NeoError ( statusCode, data ) {
  
  this.code = statusCode || null ;
  this.name = data && data.exception || "Neo4jError" ;
  this.message = data && data.message || "Unspecified neo4j API Error." ;
  
  if ( data && data.stacktrace ) {
    data.stacktrace.unshift(format("%s: %s",this.name,this.message));
    this.stack = data.stacktrace.join('\n    at ')
  }
  
}
NeoError.prototype = new Error();
NeoError.prototype.constructor = NeoError;