var passFields = require('./pass_fields')
  , Pass       = require('./Pass')

/**
 * Create a passbook template.
 * A Template acts as a pass without having all its fields set.
 *
 * Internally, on createPass it merely passes its fields and the extra ones
 * provided as an argument to a new Pass object
 *
 * @param {String} style  Pass style of the pass
 * @param {Object} fields Fields of the pass
 * @param {Object} opts   Extra options
 */
function Template(style, fields, opts) {
  // throw early if style is incorrect
  if (passFields.STYLES.indexOf(style) === -1) {
    throw new Error('Incorrect passbook style ' + style)
  }

  this.style  = style
  this.opts   = opts   || {}
  this.fields = fields || {}

  // Set formatVersion by default
  this.fields.formatVersion = 1
}

/**
 * Sets pass certificates
 *
 * @param  {Object} certs Object containing apple wwdr and pass certificates
 */
Template.prototype.certs = function setCerts(certs) {
  // Create certs object, in case they were not provided to the constructor
  if (!this.opts.certs) {
    this.opts.certs = {}
  }

  this.opts.certs.wwdr = certs.wwdr
  this.opts.certs.pass = certs.pass
}

/**
 * Create a new pass and pass all the information of the template to it
 *
 * @param  {Object}   fields Extra fields
 * @param  {Function} cb     Callback function
 */
Template.prototype.createPass = function createPass(fields, cb) {
  // merge new keys with the old ones
  // arrays are a special thing here, since we wanna push instead of replace
  
  var template = this.fields
  for (var k in template) {
    var type = typeof template[k]
    if (Array.isArray(template[k]) && Array.isArray(fields[k])) {
      for (var i = 0; i < template[k].length; i++) {
        fields[k].push(template[k][i])
      }
    }
    else {
      fields[k] = template[k]
    }
  }

  return new Pass(this.style, fields, this.opts, cb)
}


module.exports = Template
