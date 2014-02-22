# node-cypher

Node Cypher is a cypher-only http client factory for neo4j that allows you to configurably optimize for individual query speed or overall query volume/throughput. Queries should not be treated as transactional, interdependent, or referential.

## Examples

```javascript
var cypher = require('node-cypher');

cypher.createClient('http://localhost:7474',function(err,client){
  client.query("MATCH (n:Person) RETURN count(n)",{},function(err,result){
    ...
  })
})
```
By default, node-cypher will make an individual request per query and does not throttle the quantity of outgoing requests in any way. In the case that you are going to be hitting Neo4j with a high volume of
requests, you can limit the amount of concurrent outgoing requests, and optimize the number of queries run in a batch per request.

Normally, one would directly use the 'batch' or 'transactional' rest APIs in order to do this. However, these come with some caveats. 1) You could manually bundle up your requests into a batch, or 2) iteratively hit the transactional cypher endpoint. Either way, in the context of a batch or an open transaction, you are subject to a single failed request causing the entire lot to be rolled back.

node-cypher allows you to limit the number of outgoing requests and queue up pending queries against a pool of concurrent batch transactions. Meanwhile, if a batch fails, it intelligently reorders and retries uncommitted (but unproblematic) components of the batch in order to guarantee that each query that can be committed successfully, will be committed. Moreover, every failing component of the batch will be handled appropriately with its associated exception.

In the following example, a barrage of incoming requests will be distributed among a pool of ten concurrent batch operations, each submitting a maximum of 100 queries per batch.

```javascript
var connOpts = {
  host: 'http://localhost:7474', 
  base: '/db/data'
};
var clientOpts = {
  concurrency: 10, // default=Infinity
  batchMax: 100   // default=1
};
cypher.createClient(connOpts, clientOpts, function(err,client){
  
  for ( var i=0; i<= 10000; i++ ) {
    client.query("CREATE (n:Person{ct:{ct}}) RETURN count(n)",{ct:i},function(err,result){
      ...
    })
  }
  
})

```

It is important to remember that each individual query will not complete any faster than a single http request would facilitate under normal volume. However, under high volume, your overall throughput will increase dramatically.


## ClientFactory

### createClient(connectionOptions, [clientOptions,] callback )

create a cypher client with specified options. To batch or not to batch...

NOTE: in any situation where the client is committing a single statement, the normal cypher endpoint will be used instead of the batch endpoint. With the default configuration, calling "query" 1000 times will result in 1000 individual concurrent requests, each committing a single cypher statement.

__Arguments__

* connectionOptions - A URL string or object. Defaults: { host:'http://localhost:7474', base: '/db/data' }
* clientOptions - An optional object containing batching and concurrency options. Defaults: { concurrency: Infinity, batchMax: 1 }
* callback(err, results) - An optional callback to run once the client has been initialized or an error should the handshake with neo not complete successfully. 

__Example__

```javascript
var connOpts = {
  host: 'http://localhost:7474', 
  base: '/db/data'
};
var clientOpts = {
  concurrency: 10, // default=Infinity
  batchMax: 100   // default=1
};
cypher.createClient(connOpts, clientOpts, function(err,client){
  
  for ( var i=0; i<= 10000; i++ ) {
    client.query("CREATE (n:Person{ct:{ct}}) RETURN count(n)",{ct:i},function(err,result){
      ...
    })
  }
  
})

```

---------------------------------------

## CypherClient

### query(cypherQuery, parameters, [callback])

Run a query against the current client. The query will either execute immediately or will be queued against the client's pool of batch operations, depending on the client's configuration.

__Arguments__

* cypherQuery - A string or Buffer reflecting a cypher statement
* parameters - An object containing parameters passed to the cypher query. Must be provided, even if empty/null. Argument order is implied.
* callback(err, results) - An optional callback to run once the query has been committed or has failed.

__Example__

```js
client.query("CREATE (n:Person{ct:{ct}}) RETURN n",{ct:i},function(err,result){
  ...
})
```

---------------------------------------

### multi([statements])

Explicitly execute a number of statements in a single batch commit if possible. Additional attempts may be made in order to handle failing components. Again, each query should be considered an independent transaction. The api is similar to redisClient.multi, and functions similarly as well.

__Arguments__

* statements - An optional array of statements to initialize the multi. Ex: [{query:"",params:{},cb:fn}]

__Example__

```js
cypher.createClient(connOpts, clientOpts, function(err,client){
  
  var multi = client.multi();
  multi.query("CREATE (n:Person{ct:{ct}}) RETURN n",{ct:1},function(err,result){
    ...
  })
  multi.query("CREATE (n:Person{ct:{ct}}) RETURN n",{ct:2},function(err,result){
    ...
  })
  multi.exec(function(err){
    // will fire once all the queries associated with this multi have been resolved as committed or failed.
  })
  
});
```