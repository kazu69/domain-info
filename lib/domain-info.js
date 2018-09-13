"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.punycode = exports.whois = exports.reverse = exports.groper = void 0;

var dns = _interopRequireWildcard(require("native-dns"));

var _net = _interopRequireDefault(require("net"));

var _punycode = _interopRequireDefault(require("punycode"));

var _tldjs = _interopRequireDefault(require("tldjs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var topLevelWhoisServerDomai = 'whois-servers.net';
var dnsTypes = ['A', 'AAAA', 'NS', 'CNAME', 'PTR', 'NAPTR', 'TXT', 'MX', 'SRV', 'SOA', 'TLSA'];
var ipMatcher = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/;
var defaultDnsServer = {
  address: '1.1.1.1',
  port: 53,
  type: 'tcp'
};
var defaultTimeout = 3000;
/**
 * node-dns wrapper method.
 * type is resource record type. example "A", "MX" etc.
 * option is node-dns remote end point option.
 * { address: "ip address", port: "remote port number", type: "udp or tcp"}
 * timeout is a number in milliseconds that is wait for the request to finish.
 *
 * @param {String} domain
 * @param {Array} types
 * @param {IdnsServer} option
 * @param {Number} timeout
 * @returns {Promise}
 */

function requestDns(domain, types, option, timeout) {
  var promises = [];
  var recordTypes = [];

  if (!types || types.length === 0) {
    recordTypes = ['A'];
  } else {
    recordTypes = types;
  }

  recordTypes.map(function (type) {
    promises.push(ajaxRequest(domain, type, option, timeout));
  });
  return new Promise(function (resolve, reject) {
    Promise.all(promises).then(function (values) {
      var response = {};
      values.map(function (obj) {
        Object.keys(obj).map(function (k) {
          response[k] = obj[k];
        });
      });
      resolve(response);
    }).catch(function (err) {
      reject(err);
    });
  });
}
/**
 * This method asynchronously requests the dns server.
 * This method return promise object as execution result.
 *
 * @param {String} domain
 * @param {Array} type
 * @param {IdnsServer} dnsServer
 * @param {Number} timeout
 * @returns {Promise}
 */


function ajaxRequest(domain, type, dnsServer) {
  var timeout = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : defaultTimeout;
  var server = defaultDnsServer;
  return new Promise(function (resolve, reject) {
    var questionOpts = {
      name: domain,
      type: type
    };
    var requestOption = {
      cache: false,
      question: dns.Question(questionOpts),
      server: Object.assign(server, dnsServer),
      timeout: timeout
    };

    if (timeout) {
      requestOption.timeout = timeout;
    }

    var request = dns.Request(requestOption);
    request.on('timeout', function () {
      reject(new Error('DNS request timed out'));
    });
    request.on('cancelled', function () {
      reject(new Error('DNS request cancelled'));
    });
    request.on('error', function (error) {
      reject(error);
    });
    request.on('message', function (_, response) {
      resolve(_defineProperty({}, type, response.answer));
    });
    request.send();
  });
}
/**
 * Validate resource record type.
 *
 * @param {Array|String} types
 * @return {Array}
 */


function validateDnsType(types) {
  if (!types || types !== 'ANY' && typeof types.length !== 'number') {
    throw new Error('Expected a `types is Array`');
  }

  var recordTypes;
  var validTypes = [];

  if (types === 'ANY' || types.includes('ANY')) {
    recordTypes = dnsTypes;
  } else {
    if (typeof types === 'string') {
      recordTypes = [types];
    } else {
      recordTypes = types;
    }
  }

  recordTypes.forEach(function (type) {
    var matched = dnsTypes.find(function (elem) {
      return type.toUpperCase() === elem;
    });

    if (typeof matched === 'string') {
      validTypes.push(matched);
    }
  });
  return validTypes;
}
/**
 * Get Whois server and Whois domain.
 * First, Make the FQDN that was the TLD + whois-servers.net.
 *
 * @param {String} domain
 * @param {Object} options
 * @return {Promise}
 */


function requestWhois(domain, options) {
  var whoisServer, port;
  return new Promise(function (resolve, reject) {
    var func = function func(domain, whoisServer, port) {
      getWhoisDomain(domain, whoisServer, port).then(function (data) {
        resolve(data);
      }).catch(function (error) {
        reject(error);
      });
    };

    if (options && options.server) {
      whoisServer = options.server;

      if (options.port) {
        port = options.port;
      }

      func.call(null, domain, whoisServer, port);
    } else {
      getTopLevelWhoisServer(domain).then(function (whoisServers) {
        whoisServer = whoisServers[0];
        func.call(null, domain, whoisServer, port);
      }).catch(function (error) {
        reject(error);
      });
    }
  });
}
/**
 * Get the whois server of the top level domain
 *
 * @param {String} domain
 * @return {Promise}
 */


function getTopLevelWhoisServer(domain) {
  var tmp = domain.split('.'),
      tld = tmp[tmp.length - 1],
      cname = "".concat(tld, ".").concat(topLevelWhoisServerDomai),
      messege = {
    not_found: 'Whois Server `NOT FOUND`'
  };
  return new Promise(function (resolve, reject) {
    dns.resolveCname(cname, function (error, servers) {
      if (servers && servers.length > 0) {
        resolve(servers);
      } else {
        !error ? reject(messege.not_found) : reject(error);
      }
    });
  });
}
/**
 * Get whois information of the domain
 *
 * @param {String} domain
 * @param {String} server
 * @return {Promise}
 */


function getWhoisDomain(domain, server) {
  var port = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 43;

  if (!domain) {
    throw new Error('`domain` is required');
  }

  if (!server) {
    throw new Error('`server` is required');
  }

  var socket = new _net.default.Socket();
  var encoding = 'utf8';
  return new Promise(function (resolve, reject) {
    var result = [];
    socket.setEncoding(encoding);
    socket.setKeepAlive(true, 0);
    socket.connect(port, server);
    socket.on('data', function (data) {
      result.push(data.toString());
    });
    socket.on('error', function (error) {
      reject(error);
    });
    socket.on('timeout', function (error) {
      reject(error);
    });
    socket.on('end', function () {
      resolve(result.join("\r\n"));
    });
    socket.end("".concat(domain, "\r\n"), encoding);
  });
}
/**
 * IP address reverse.
 * support ipv4 only.
 *
 * @param {String} ip
 * @return {Promise}
 */


function reverseDomain(ip) {
  if (!ipMatcher.test(ip)) {
    throw new Error('IP is not valid');
  }

  return new Promise(function (resolve, reject) {
    dns.reverse(ip, function (error, hostname) {
      if (reverse) {
        resolve(hostname);
      } else {
        reject(error);
      }
    });
  });
}
/**
 * Decode Punycode.
 *
 * @param {String} ascii
 * @return {String}
 */


function decodePuny(ascii) {
  return _punycode.default.toUnicode(ascii);
}
/**
 * Encode Punycode.
 *
 * @param {String} unicode
 * @return {String}
 */


function encodePuny(unicode) {
  return _punycode.default.toASCII(unicode);
}

var groper = function groper(domain, types, options, cb) {
  if (typeof domain !== 'string') {
    throw new Error('Expected a `domain`');
  }

  var defaultOptions = {
    server: defaultDnsServer,
    timeout: defaultTimeout
  };
  var callback;
  var requestOptions = defaultOptions;

  if (typeof types === 'function') {
    callback = types;
  } else if (typeof options === 'function') {
    callback = options;
    requestOptions = Object.assign(defaultOptions, cb);
  } else if (cb) {
    requestOptions = Object.assign(defaultOptions, options);
    callback = cb;
  }

  var domainName = encodePuny(domain);
  var type,
      server,
      timeout,
      resourceTypes = ['ANY'];

  if (typeof types === 'string') {
    resourceTypes = new Array(types);
  }

  if (Array.isArray(types)) {
    resourceTypes = types;
  }

  if (resourceTypes.includes('ANY')) {
    resourceTypes = ['ANY'];
  }

  type = validateDnsType(resourceTypes);

  if (type.length === 0) {
    throw new Error('Valid No `DNS TYPE` exitst');
  }

  if (requestOptions.server) {
    server = requestOptions.server;
  }

  if (requestOptions.timeout) {
    timeout = requestOptions.timeout;
  }

  var promise = requestDns(domainName, type, server, timeout);

  if (callback && typeof callback === 'function') {
    promise.then(function (data) {
      return callback(null, data);
    }).catch(function (error) {
      return callback(error, null);
    });
  } else {
    return promise;
  }
};

exports.groper = groper;

var reverse = function reverse(ip, cb) {
  if (typeof ip !== 'string') {
    throw new Error('Expected a `ip address`');
  }

  var promise = reverseDomain(ip);

  if (cb && typeof cb === 'function') {
    promise.then(function (data) {
      return cb(null, data);
    }).catch(function (error) {
      return cb(error, null);
    });
  } else {
    return promise;
  }
};

exports.reverse = reverse;

var whois = function whois(domain, opts, cb) {
  if (typeof domain !== 'string') {
    throw new Error('Expected a `domain name`');
  }

  var callback;

  if (typeof opts === 'function') {
    callback = opts;
  } else {
    callback = cb;
  }

  if (_tldjs.default.tldExists(domain) === false) {
    throw new Error('Invalid a `domain name`');
  }

  var encodedDomain = "".concat(encodePuny(domain)),
      promise = requestWhois(encodedDomain, opts);

  if (callback && typeof callback === 'function') {
    promise.then(function (data) {
      return callback(null, data);
    }).catch(function (error) {
      return callback(error, null);
    });
  } else {
    return promise;
  }
};

exports.whois = whois;

var punycode = function punycode(ascii_or_unicode) {
  var type = ascii_or_unicode.match(/^xn--/) ? 'decode' : 'encode';

  if (type === 'decode') {
    return decodePuny(ascii_or_unicode);
  } else {
    return encodePuny(ascii_or_unicode);
  }
};

exports.punycode = punycode;