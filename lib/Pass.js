var _          = require('underscore')
  , archiver   = require('archiver')
  , async      = require('async')
  , Stream     = require('stream').Stream
  , inherits   = require('util').inherits
  , path       = require('path')
  , fs         = require('fs')
  , spawn      = require('child_process').spawn
  , passFields = require('./pass_fields')
  , Manifest   = require('./Manifest')


/**
 * Generates a pass over a streaming interface or optionally a callback
 *
 * @param {String}   style  Style of the pass
 * @param {Object}   fields Pass fields
 * @param {Object}   opts   Extra options
 * @param {Function} cb     Callback function
 */
function Pass(style, fields, opts, cb) {
  Stream.call(this)

  // Get our own shallow copy of the fields
  this.fields = _.extend({}, fields)
  this.style  = style
  this.opts   = opts

  if (!this.fields[style]) {
    this.fields[style] = {}
  }

  // Copy structure fields to style
  if (this.fields.structure) {
    this.fields[style] = this.fields.structure
  }

  // Structure no longer needed
  delete this.fields.structure

  // setup images and certs
  this._setupImages()
  this._setupCerts(opts.certs)

  // Transform relevantData to ISO Date if its a Date instance
  if (fields.relevantDate instanceof Date) {
    fields.relavantDate = fields.relavantDate.toISOString()
  }

  // Validate pass fields and generate
  this.validate()
  this.cb = cb
  process.nextTick(this._generate.bind(this))
}

inherits(Pass, Stream)

/**
 * Set's up images provided as fields
 */
Pass.prototype._setupImages = function () {
  var self = this
  
  self.images = {}
  
  function setupImage(name) {
    self.images[name] = self.fields[name]
    var image = self.images[name]
    var isUnkownType =
         (typeof image !== 'string') &&
        !(image instanceof Buffer)   &&
        !(image instanceof Stream)
    if (isUnkownType) {
      throw new Error(name + ' cannot be ' + typeof image)
    }
    if (typeof image === 'string') {
      image = path.resolve(image)
      self.images[name] = fs.createReadStream(image)
      self.images[name].on('error', self._error.bind(self))
    }
    
    if (self.images[name] instanceof Stream) {
      self.images[name].pause()
    }
    
    delete self.fields[name]
  }

  // Set up each possible images a pass might have
  for (var i = 0; i < passFields.IMAGES.length; i++) {
    var name = passFields.IMAGES[i]

    // Setup only if this image is provided
    if (self.fields[name]) {
      setupImage(name)
    }
  }
}

/**
 * Required certs: Apple WWDR and the certificate of the pass
 * @type {Array}
 */
var CERTS = ['wwdr', 'pass']

/**
 * Set's up certs provided in the options
 */
Pass.prototype._setupCerts = function () {
  this.certs = this.opts.certs

  // Certs are required and must be an object
  if (typeof this.certs !== 'object') {
    throw new Error('No certs given or not an object')
  }

  // Go over each key and make sure its a string
  for (var i = 0; i < CERTS.length; i++) {
    var keyName = CERTS[i]
    if (!this.certs[keyName] || typeof this.certs[keyName] !== 'string') {
      throw new Error('No ' + keyName + ' cert given or not a string')
    }
  }
}

/**
 * Validate the pass
 */
Pass.prototype.validate = function () {
  var fields = this.fields
    , style  = this.style
    , i

  // Ensure pass has a valid style
  if (passFields.STYLES.indexOf(style) === -1) {
    throw new Error('Incorrect passbook style ' + style)
  }
  
  // Ensure pass contains all required top level fields
  for (i = 0; i < passFields.REQUIRED_TOP_LEVEL.length; i++) {
    var attr = passFields.REQUIRED_TOP_LEVEL[i]
    if (!fields[attr]) {
      throw new Error(attr + ' is required')
    }
  }

  // If pass style is boardingPass then it must contain transitType
  var transitForbidden =
    (style !== 'boardingPass') &&
    (fields[style].transitType)

  if (transitForbidden) {
    throw new Error('transitType is only allowed in a boardingPass')
  }

  if (typeof fields.locations !== 'undefined') {
    // Pass locations must be an Array
    if (!Array.isArray(fields.locations)) {
      throw new Error('locations must be an array')
    }

    // Go over each location and make sure it has a valid latitude and longitude
    for (i = 0; i < fields.locations.length; i++) {
      var location     = fields.locations[i]
        , missingCoord =
            (typeof location.latitude   !== 'number') ||
            (typeof location.longitude !== 'number')

      if (missingCoord) {
        throw new Error('location.latitude or longitude is missing or is not a number')
      }
    }
  }

  if (typeof fields.barcode !== 'undefined') {
    var barcode = fields.barcode

    // Pass barcode must be an object
    if (typeof barcode !== 'object') {
      throw new Error('barcode must be an object')
    }

    // Pass barcode must have a format
    if (typeof barcode.format !== 'string') {
      throw new Error('barcode.format is required and must be a string')
    }

    // Pass barcode must have a message
    if (typeof barcode.message !== 'string') {
      throw new Error('barcode.message is required and must be a string')
    }

    // Pass barcode must have a messageEncoding
    if (typeof barcode.messageEncoding !== 'string') {
      throw new Error('barcode.message is required and must be a string')
    }
  }
}

Pass.prototype._error = function (err) {
  if (this.cb) {
    this.cb(err)
  }
  else {
    this.emit('error', err)
  }
}

/**
 * Initiates generation flow
 */
Pass.prototype._generate = function () {
  var zip      = archiver.createZip({ level: 1 })
    , manifest = new Manifest()
    , buffers  = []
    , self     = this
    , cb       = self.cb

  zip.on('data', function (data) {
    // If we'll deliver through callback, add data to buffers array
    if (cb) {
      return buffers.push(data)
    }
    else {
      self.emit('data', data)
    }
  })

  zip.on('end', function () {
    // If callback provided, concat buffers and deliver response
    if (cb) {
      buffers = Buffer.concat(buffers)
      cb(null, buffers)
    }
    else {
      self.emit('end')
    }
  })

  zip.on('error', self._error.bind(self))

  // Generate pass.json contents from fields
  var pass = new Buffer(JSON.stringify(self.fields))

  async.auto({
    addPass: function (autoCb) {
      var name = 'pass.json'

      // Add pass.json to zip and compute its hash
      async.parallel([
        zip.addFile.bind(zip, pass, { name: name }),
        manifest.add.bind(manifest, name, pass)
      ], autoCb)
    },
    addImages: ['addPass', function (autoCb) {
      var imagesUsed = Object.keys(self.images)

      async.forEachSeries(imagesUsed, function (name, eachCb) {
        var image = self.images[name]

        // Take care of high resolution images
        if (name.indexOf('2x') !== -1) {
          name = name.replace('2x', '@2x')
        }
        
        name = name + '.png'
        
        // Add image to zip and compute its hash
        async.parallel([
          zip.addFile.bind(zip, image, { name: name }),
          manifest.add.bind(manifest, name, image)
        ], eachCb)

        // If image is a stream, then resume it (we've paused it earlier)
        if (image instanceof Stream) {
          image.resume()
        }

      }, autoCb)
    }],
    createManifest: ['addImages', function (autoCb) {
      // Generate manifest file contents
      var hashes = new Buffer(JSON.stringify(manifest.hashes))
      autoCb(null, hashes)
    }],
    addManifest: ['createManifest', function (autoCb, autoRes) {
      var hashes = autoRes.createManifest

      // Add manifest to zip
      zip.addFile(hashes, { name: 'manifest.json' }, autoCb)
    }],
    createSignature: ['createManifest', function (autoCb, autoRes) {
      var manifest = autoRes.createManifest
        , buffers  = []
        , args     =
            [ 'smime'
            , '-sign'
            , '-binary'
            , '-signer',   path.resolve(self.certs.pass)
            , '-certfile', path.resolve(self.certs.wwdr)
            , '-passin',   'pass:' + self.certs.password
            ]
        , openssl  = spawn('openssl', args)
        , error    = false

      // Spawn openssl with appropriate args and read stdout/stderr
      openssl.stdout.on('data', function (data) {
        buffers.push(data)
      })

      openssl.stderr.on('data', function (data) {
        buffers.push(data)
        error = true
      })

      openssl.stdout.on('end', function () {
        buffers = Buffer.concat(buffers)
        // Extract signature from whole stdout
        var output = buffers.toString()

        if (error) {
          return autoCb(new Error(output))
        }
        output = output.split('\n\n')[3]
        
        // Convert to buffer from base64 output of openssl
        output = new Buffer(output, 'base64')
        autoCb(null, output)
      })

      // Write to openssl's stdin the manifest to sign it
      openssl.stdin.write(manifest)
      openssl.stdin.end()
    }],
    addSignature: ['addManifest', 'createSignature', function (autoCb, autoRes) {
      var signature = autoRes.createSignature

      // Add signature to zip
      zip.addFile(signature, { name: 'signature' }, autoCb)
    }]
  }, function (err) {
    if (err) {
      return self._error(err)
    }

    zip.finalize()
  })
}

module.exports = Pass
