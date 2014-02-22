var _ = require('underscore');
var format = require('util').format;

module.exports = NeoError ;

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