var Stream       = require('stream').Stream
  , Crypto       = require('crypto')


/**
 * Computes manifest file hashes
 */
function Manifest() {
  // Holds the hash results for each file
  this.hashes = {}
}

/**
 * Add a file for hash computation
 *
 * @param {String}   filename String
 * @param {Object}   contents File contents
 * @param {Function} cb       Callback function
 */
Manifest.prototype.add = function (filename, contents, cb) {
  var hasher = Crypto.createHash('sha1')
    , self   = this

  if (contents instanceof Buffer) {
    hasher.update(contents)
    process.nextTick(after)
  }
  else if (contents instanceof Stream) {
    contents.on('data', function (data) {
      hasher.update(data)
    })
    contents.on('end', after)
  }
  else {
    throw new Error('contents must be instance of Buffer or Stream')
  }

  function after() {
    self.hashes[filename] = hasher.digest('hex')
    cb()
  }
}

module.exports = Manifest
