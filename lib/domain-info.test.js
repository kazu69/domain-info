'use strict';

var _ava = _interopRequireDefault(require("ava"));

var domainInfo = _interopRequireWildcard(require("./domain-info"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_ava.default.cb('.groper() return promise when without callback function.', function (t) {
  var domain = 'example.com',
      type = 'A',
      server = {
    address: '8.8.8.8',
    port: 53,
    type: 'tcp'
  },
      timeout = 3000,
      options = {
    server: server,
    timeout: timeout
  };
  var promise = domainInfo.groper(domain, type, options);
  promise.then(function (data) {
    var record = data.A.find(function (elem) {
      if (elem.address) {
        return elem;
      }
    });
    t.is(record.address, '93.184.216.34');
    t.end();
  }).catch(function () {
    t.pass();
    t.end();
  });
});

_ava.default.cb('.groper() return domain resource record.', function (t) {
  var server = {
    address: '8.8.8.8',
    port: 53,
    type: 'tcp'
  },
      types = ['A', 'NS', 'MX'],
      domain = 'example.com',
      timeout = 10000;
  var options = {
    server: server,
    timeout: timeout
  };

  var callback = function callback(error, data) {
    if (!data) {
      return;
    }

    setTimeout(function () {
      t.end();
    }, 10000);
    var record;
    data.map(function (datum) {
      record = datum.A.find(function (elem) {
        if (elem.address) {
          return elem;
        }
      });
    });
    t.is(record.address, '93.184.216.34');
    t.is(data.MX.length, 0);
    t.true(data.NS[0].data.indexOf('iana-servers.net') !== -1);
    t.is(error, null);
    t.end();
  };

  return domainInfo.groper(domain, types, options, callback);
});

_ava.default.cb('.groper() types has ANY returns all types', function (t) {
  var server = {
    address: '8.8.8.8',
    port: 53,
    type: 'tcp'
  },
      types = ['ANY', 'NS', 'MX'],
      domain = 'example.com',
      timeout = 10000;
  var options = {
    server: server,
    timeout: timeout
  };

  var callback = function callback(error, data) {
    if (!data) {
      return;
    }

    setTimeout(function () {
      t.end();
    }, 10000);
    t.true(!!data.A);
    t.true(!!data.AAAA);
    t.true(!!data.NS);
    t.true(!!data.CNAME);
    t.true(!!data.PTR);
    t.true(!!data.NAPTR);
    t.true(!!data.TXT);
    t.true(!!data.MX);
    t.true(!!data.SRV);
    t.true(!!data.SOA);
    t.true(!!data.TLSA);
    t.is(error, null);
    t.end();
  };

  return domainInfo.groper(domain, types, options, callback);
});

_ava.default.cb('.groper() enable encode punycode domain', function (t) {
  var domain = '日本語.jp',
      type = 'A';

  var callback = function callback(error, data) {
    var record = data.A.find(function (elem) {
      if (elem) {
        return elem;
      }
    });
    t.is(record.name, 'xn--wgv71a119e.jp');
    t.is(record.address, '117.104.133.167');
    t.is(error, null);
    t.end();
  };

  return domainInfo.groper(domain, type, callback);
});

_ava.default.cb('.groper() return error with message.', function (t) {
  var server = {
    address: '8.8.8.8',
    port: 53,
    type: 'tcp'
  },
      types = ['A', 'CNAME', 'MX'],
      domain = 'example.com',
      timeout = 1;
  var options = {
    server: server,
    timeout: timeout
  };

  var callback = function callback(error, data) {
    t.is(data, null);
    t.is(error.name, "Error");
    t.is(error.stack.split(/\n/, 1)[0], 'Error: DNS request timed out');
    t.end();
  };

  return domainInfo.groper(domain, types, options, callback);
}); // test('.groper() throw error when supply invalid arguents', t => {
//     const callback = () => {};
//     t.throws(() => { domainInfo.groper(null, callback) }, 'Expected a `domain`');
// });


_ava.default.cb('.reverse() return promise when without callback function.', function (t) {
  var ip = '8.8.8.8',
      promise = domainInfo.reverse(ip);
  promise.then(function (hostname) {
    t.deepEqual(hostname, ['google-public-dns-a.google.com']);
    t.end();
  });
});

_ava.default.cb('.reverse() return hostname.', function (t) {
  var ip = '8.8.8.8',
      callback = function callback(error, data) {
    t.deepEqual(data, ['google-public-dns-a.google.com']);
    t.end();
  };

  return domainInfo.reverse(ip, callback);
});

(0, _ava.default)('.reverse() throw error when supply invalid arguents', function (t) {
  var ip = null;
  t.throws(function () {
    domainInfo.reverse(ip);
  }, 'Expected a `ip address`');
});

_ava.default.cb('.whois() return promise when without callback function.', function (t) {
  var domain = 'google-public-dns-a.google.com',
      options = {
    recordType: 'nameserver',
    server: 'whois.verisign-grs.com',
    port: 43
  },
      promise = domainInfo.whois(domain, options);
  promise.then(function (data) {
    t.not(data, null);
    t.not(data, undefined);
    t.not(data, '');
    t.true(typeof data === 'string');
    t.end();
  });
});

_ava.default.cb('.whois() return domain information', function (t) {
  var domain = 'example.com',
      options = {
    recordType: 'domain',
    server: 'whois.verisign-grs.com',
    port: 43
  },
      callback = function callback(error, data) {
    t.not(data, null);
    t.not(data, undefined);
    t.not(data, '');
    t.true(typeof data === 'string');
    t.end();
  };

  return domainInfo.whois(domain, options, callback);
});

(0, _ava.default)('.whois() throw error when supply invalid arguents', function (t) {
  var domain = null;
  t.throws(function () {
    domainInfo.whois(domain);
  }, 'Expected a `domain name`');
  domain = 'foobar.dummy';
  t.throws(function () {
    domainInfo.whois(domain);
  }, 'Invalid a `domain name`');
});
(0, _ava.default)('.punycode() return encoded string when supply unicode', function (t) {
  var domain = '日本語.jp',
      encoded = domainInfo.punycode(domain);
  t.is(encoded, 'xn--wgv71a119e.jp');
});
(0, _ava.default)('.punycode() return decoded string when supply ascii', function (t) {
  var domain = 'xn--wgv71a119e.jp',
      encoded = domainInfo.punycode(domain);
  t.is(encoded, '日本語.jp');
});