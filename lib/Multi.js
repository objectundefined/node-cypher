var _ = require('underscore');
var request = require('request');
var format = require('util').format;
var NeoError = require('./NeoError');

module.exports = Multi ;

function Multi (client, reqs) {
  this._client = client;
  this._requests = _.isArray(reqs) ? reqs : [];
};

Multi.prototype.query = function (query, params, cb) {
  this._requests.push({ query : query, params: params, cb : cb||function(){} })
};

Multi.prototype.exec = function (cb) {
  var self = this ;
  var client = self._client;
  var pending = self._requests;
  var done = cb || function(){};
  function runIteration () {
    if (pending.length==0){
      setImmediate(done,null);
    } else if (pending.length==1){
      var item = pending.pop();
      client.query(item.query,item.params,function(err,res){
        setImmediate(item.cb,err,res);
        setImmediate(done,null);
      });
    } else {
      client.queryBatch(pending,function(err,results){
        if ( err ) {
          pending.forEach(function(item){
            setImmediate(item.cb,err)
          });
          pending = self._requests = [];
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
          runIteration();
        } else {
          results.forEach(function(item,index){
            var itemThatSucceeded = pending[index];
            setImmediate(itemThatSucceeded.cb,null,item.body);
          });
          pending = self._requests = [];
          setImmediate(done,null);
        }
        
      })
    }
  }
  runIteration();
};