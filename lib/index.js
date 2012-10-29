var Template = require('./Template')

exports.createTemplate = function (style, fields, opts) {
  return new Template(style, fields, opts)
}
