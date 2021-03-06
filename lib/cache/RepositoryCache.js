var GlobalCache = require('./GlobalCache')
var util = require('util')
var async = require('async')

// Required for type checking.
var DB = require('../DB')
var RepositoryFactory = require('../RepositoryFactory')
var State = require('../State')

/**
 * @constructor
 * @extends {GlobalCache}
 * @param {State} state
 * @param {DB} db
 * @param {RepositoryFactory} repositoryFactory
 * @param {string} name The name of the cache key.
 * @param {Object} options The options for this instance of the cache.
 */
function RepositoryCache(state, db, repositoryFactory, name, options) {
  GlobalCache.call(this, state, db, name, options)

  this.repositoryFactory = repositoryFactory
}
util.inherits(RepositoryCache, GlobalCache)

RepositoryCache.prototype.prepare = function(method, fn) {
  if (this._prepared) {
    GlobalCache.prototype[method].call(this, fn)
    return
  }

  var parts = ['root', 'branch']
  if (this.options.commit) {
    parts.push('commit')
  }

  // Fetch all the parts for the repository to generate the repository's key name.
  async.map(parts, function(part, done) {
    return this.repositoryFactory[part](done)
  }.bind(this), function(err, results) {
    if (err) {
      return fn(err)
    }

    // Remove any trailing empty parts.
    while (results.length && !results[results.length - 1]) {
      results.pop()
    }

    // Update the name.
    results.unshift(this.name)
    this.name = results.join(':')

    this._prepared = true
    GlobalCache.prototype[method].call(this, fn)
  }.bind(this))
}

; // Run each exposed method through lazy async calculation of the key name.
['run', 'get', 'set', 'unset'].forEach(function(method) {
  RepositoryCache.prototype[method] = function(fn) {
    this.prepare(method, fn)
  }
})

module.exports = RepositoryCache
