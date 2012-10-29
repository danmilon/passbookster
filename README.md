
## Install

    $ npm install passbookster

## Usage

To create a pass, you first create a pass template which holds information that remains static for each subsequent pass created from the template. Then you can create a Pass by providing the rest of the fields and images.

A Pass can act as a stream, or as a plain-callback async operation.
Performance-wise you should use the stream interface, when its possible to pipe the pass to another stream. (eg store to filesystem or Amazon S3)

You'll also need the [Apple Worldwide Developer Relations](http://www.apple.com/certificateauthority/) (WWDR) certficate and [your pass certificate](https://developer.apple.com/ios/manage/passtypeids/index.action).

`openssl` must be installed, and inside the `$PATH`. It is used internally to calculate the pass signature, since node crypto API does not support PKCS 7. (TODO).

## Example

```javascript
var passbook = require('passbookster')

var template = passbook.createTemplate('coupon', {
  passTypeIdentifier: 'PASS_TYPE_ID',
  teamIdentifier:     'TEAM_ID',
  organizationName:   'Paw Planet'
}, {
  certs: {
    wwdr: '/path/to/wwdr.pem',
    pass: '/path/to/pass_cert'
  }
})

var pass = template.createPass({
  serialNumber:    'E5982H-I2',
  backgroundColor: 'rgb(206, 140, 53)',
  description:     '20% off premium dog food',
  icon:            fs.createReadStream('/path/to/icon.png')
})

pass.pipe(fs.createWriteStream('pass.pkpass'))
```

## API

## Template

### Constructor

```javascript
var template = passbook.createTemplate(style, fields, options)
```

#### style

The style of the pass.

Must be one of: 'boardingPass', 'coupon', 'eventTicker', 'storeCard', 'generic'

#### fields

Any field that should be included in all passes created from this template. Usually you want these to be passTypeIdentifier, teamIdentifier and organizationName, but it's completely ok to pass any pass field. These will be merely copied to each pass you create.

#### options

Object containing extra information about this pass. Only certificates for now.

##### options.certs

Object with keys `wwdr` and `pass` and values the paths to the apple WWDR certificate and the pass certificate.

### Methods

```javascript
template.certs(certs)
```

#### certs

An object containing paths to apple wwdr and the pass certificate.

##### certs.wwdr

Pass to apple wwdr certificate

##### certs.pass

Pass to pass certificate

## Pass

### Constructor

```javascript
template.createPass(fields, cb)
```

#### fields

Rest of the fields you want this pass to have. Fields provided to the template will be included.

#### cb

Optional callback function. If a callback is provided, then the pass will not act as a stream, and will call this function as `cb(err, res)` when its done. Result is a buffer of the .pkpass created.

## Images

Images should be passed either in the template or pass fields. Type must be stream, buffer or path string.
Valid image keys are: 'icon', 'logo', 'strip', 'thumbnail', 'background', 'footer' and a '2x' version of each of those, in case you also have high resolution images for retina displays.

### Example

```javascript
template.createPass({
  ...
  icon:   '/path/to/image.png',
  icon2x: '/path/to/high/resolution/image.png',
  logo:   fs.createReadStream('/path/to/logo.png'),
  logo2x: streamFromS3,
  footer: footerBuffer
  ...
})
```

## Tests

```
export WWDR_CERT=/path/to/wwdr.cert
export PASS_CERT=/path/to/pass.cert

npm test
```

## TODO

* More and proper tests
* Add PKCS7 signing to node crypto
