

exports.certs = function () {
  var wwdr = process.env.WWDR_CERT
    , pass = process.env.PASS_CERT
  if (!wwdr || !pass) {
    console.error(
      'WWDR_CERT and PASS_CERT enviromental variables ' +
      'need to point to the certificate files before running the tests'
    )
    process.exit()
  }
  return {
    wwdr: wwdr,
    pass: pass
  }
}
