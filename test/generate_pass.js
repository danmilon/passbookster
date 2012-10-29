var passbook = require('../')
  , should   = require('should')
  , commons  = require('./commons')
  , fs       = require('fs')

describe('Passbook creation', function () {
  var template
    , certs = commons.certs()
    , passFields

  beforeEach(function () {
    passFields = {
      serialNumber:        'E5982H-I2',
      webServiceURL:       'https://example.com/passes/',
      authenticationToken: 'vxwxd7J8AlNNFPS8k0a0FfUFtq0ewzFdc',
      barcode: {
        message:         '123456789',
        format:          'PKBarcodeFormatPDF417',
        messageEncoding: 'iso-8859-1'
      },
      locations: [{
        longitude: -122.3748889,
        latitude:   37.6189722
      }, {
        longitude: -122.03118,
        latitude:   37.33182
      }],
      organizationName: 'Paw Planet',
      logoText:         'Paw Planet',
      description:      '20% off premium dog food',
      foregroundColor:  'rgb(255, 255, 255)',
      backgroundColor:  'rgb(206, 140, 53)',
      coupon: {
        primaryFields : [{
          key:   'offer',
          label: 'Any premium dog food',
          value: '20% off'
        }],
        auxiliaryFields : [{
          key:   'expires',
          label: 'EXPIRES',
          value: '2 weeks'
        }],
        backFields : [{
          key:   'terms',
          label: 'TERMS AND CONDITIONS',
          value: 'Generico offers this pass, including all information, software, products and services available from this pass or offered as part of or in conjunction with this pass (the "pass"), to you, the user, conditioned upon your acceptance of all of the terms, conditions, policies and notices stated here. Generico reserves the right to make changes to these Terms and Conditions immediately by posting the changed Terms and Conditions in this location.\n\nUse the pass at your own risk. This pass is provided to you "as is," without warranty of any kind either express or implied. Neither Generico nor its employees, agents, third-party information providers, merchants, licensors or the like warrant that the pass or its operation will be accurate, reliable, uninterrupted or error-free. No agent or representative has the authority to create any warranty regarding the pass on behalf of Generico. Generico reserves the right to change or discontinue at any time any aspect or feature of the pass.'
        }]
      },
      icon:   __dirname + '/passes/coupon/icon.png',
      icon2x: __dirname + '/passes/coupon/icon@2x.png',
      logo:   __dirname + '/passes/coupon/logo.png',
      logo2x: __dirname + '/passes/coupon/logo@2x.png'
    }

    template = passbook.createTemplate('coupon', {
      passTypeIdentifier: 'pass.com.pawplanet.coupon',
      teamIdentifier:     'A1B2C3D4E5',
      backgroundColor:    'rgb(206, 140, 53)',
      organizationName:   'Paw Planet'
    }, {
      certs: certs
    })
  })

  it('should create a pass', function (done) {
    template.createPass(passFields, function (err, buf) {
      should.ifError(err)
      should.exist(buf)
      buf.should.be.an.instanceOf(Buffer)
      done()
    })
  })

  it('should create a pass streaming', function (done) {
    var pass = template.createPass(passFields)

    pass.on('error', done)
    pass.on('end',   done)
  })
})
