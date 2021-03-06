var path = require('path')
var exec = require('child_process').exec
var crypto = require('crypto')

// Required for type checking.
var CacheFactory = require('./CacheFactory')

/**
 * @param {CacheFactory} cacheFactory
 * @constructor
 */
function Plugin(cacheFactory, name) {
  /** @private {CacheFactory} */
  this._cacheFactory = cacheFactory

  this.name = name
  this.register = this.register.bind(this)
  this.methods = {
    register: this.register
  }
}

Plugin.prototype.register = function(key, options) {
  var cacheType = options.cache
  delete options.cache

  var cache = this._cacheFactory.create(cacheType, this.name + ':' + key, options)
  this.methods[key] = cache.run
  return cache.run
}

/**
 * @param {CacheFactory} cacheFactory
 * @constructor
 */
function PluginFactory(cacheFactory) {
  /** @private {CacheFactory} */
  this._cacheFactory = cacheFactory

  this._pendingLoadCallbacks = []
  this._loadedPlugins = false
  this._isPluginLoaderClaimed = false
}

PluginFactory.prototype.claimPluginLoader = function () {
  if (this._isPluginLoaderClaimed) throw new Error('The plugin loader can only be claimed once.')
  this._isPluginLoaderClaimed = true

  return function () {
    if (this._loadedPlugins) return

    this._loadedPlugins = true
    this._pendingLoadCallbacks.forEach(function (loadCallback) {
      loadCallback()
    })
  }.bind(this)
}

// Register a new Impromptu plugin.
PluginFactory.prototype.create = function (fn) {
  // Generate a unique name for the plugin based on the call stack.
  var name = crypto.createHash('md5').update(new Error().stack).digest('hex')

  var methods = new Plugin(this._cacheFactory, name).methods
  var loadCallback = fn.bind(null, methods)
  if (this._loadedPlugins) {
    loadCallback()
  } else {
    this._pendingLoadCallbacks.push(loadCallback)
  }

  return methods
}

module.exports = PluginFactory
