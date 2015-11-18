var xtend = require('xtend')
var Prometheus = require('prometheus-client-js')

var HTTPMetrics = module.exports = function HTTPMetrics(client, opts) {
  if (!(this instanceof HTTPMetrics)) {
    return new HTTPMetrics(client, opts)
  }

  if (!(client instanceof Prometheus)) {
    if (typeof client == 'object') {
      opts = client
      client = null
    }
  }

  this.opts = opts
  this.client = client || new Prometheus(this.opts)

  var metrics = {
    requests: this.client.createCounter({
      name: 'http_requests_total',
      subsystem: 'http',
      help: 'The total number of http requests'
    }),
    connections: this.client.createGauge({
      name: 'connections_total',
      subsystem: 'http',
      help: 'The current number of http connections'
    }),
    responseTime: this.client.createHistogram({
      name: 'http_response_times',
      subsystem: 'http',
      help: 'The response times of http requests'
    }),
  }
  
  return this
}

HTTPMetrics.prototype.attach = function(server) {
  var self = this

  server.on('connection', function() {
    self.metrics.connections.set(server._connections)
  })
  server.on('disconnect', function() {
    self.metrics.connections.set(server._connections)
  })
  server.on('request', function(req, res) {
    req.responseStartTime = process.hrtime()
    req.on('end', function() {
      var endTime = process.hrtime(req.responseStartTime)
      var responseTime = endTime[1] / 1000000
      var parsed = parseUrl(req.url, true)

      self.metrics.requests.increment({path: parsed.pathname, status: res.statusCode, method: req.method})
      self.metrics.responseTime.observe(responseTime)
    })
  })
}
