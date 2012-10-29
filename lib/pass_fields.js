
exports.STYLES =
  [ 'boardingPass'
  , 'coupon'
  , 'eventTicker'
  , 'storeCard'
  , 'generic'
  ]

exports.REQUIRED_TOP_LEVEL =
  [ 'description'
  , 'formatVersion'
  , 'organizationName'
  , 'passTypeIdentifier'
  , 'serialNumber'
  , 'teamIdentifier'
  ]

exports.IMAGES =
  [ 'background'
  , 'footer'
  , 'icon'
  , 'logo'
  , 'strip'
  , 'thumbnail'
  ]

exports.IMAGES.forEach(function (name) {
  exports.IMAGES.push(name + '2x')
})
