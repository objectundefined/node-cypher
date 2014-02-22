var _ = require('underscore');
var request = require('request');
var format = require('util').format;
var NeoError = require('./NeoError');

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