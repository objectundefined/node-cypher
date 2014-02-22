var CypherClient = require('./lib/CypherClient');
var request = require('request');
var _ = require('underscore');

exports.createClient = createClient = function ( hostOrConnOpts , clientOptsOrCb, cbOrNull ) {
  
  var self = this ;
  var httpOpts = self._httpOpts = _.isString(hostOrConnOpts) ? { host : hostOrConnOpts } : hostOrConnOpts || {} ;
  var clientOpts = _.isFunction(clientOptsOrCb) ? {} : clientOptsOrCb || {} ;
  var cb = _.isFunction(clientOptsOrCb) ? clientOptsOrCb : cbOrNull||function(){} ; 
  
  _.defaults(httpOpts,{
    host : 'http://localhost:7474',
    base : '/db/data'
  });
  
  request.get({
    json : true,
    url : httpOpts.host + httpOpts.base
  },function(err,result,json){
    if (err) {
      return cb(err);
    } else if (json.cypher && json.batch) {
      _.extend(httpOpts,{
        cypher : json.cypher.split(httpOpts.base)[1],
        batch : json.batch.split(httpOpts.base)[1]
      });
      cb(null,new CypherClient(httpOpts,clientOpts));
    } else {
      return cb(new Error('Cypher and Batch not available'))
    }
  })
  
}
