'use strict';

const dns = require('native-dns'),
      net = require('net'),
      Promise = require('es6-promise').Promise,
      tldjs = require('tldjs'),
      punycode = require('punycode'),
      async = require('async'),
      objectAssign = require('object-assign');

const dnsTypes = [
  'A',
  'AAAA',
  'NS',
  'CNAME',
  'PTR',
  'NAPTR',
  'TXT',
  'MX',
  'SRV',
  'SOA',
  'TLSA'
];

const ipMatcher = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/;

/**
 * node-dns wrapper method.
 * type is resource record type. example 'A', 'MX' etc.
 * opts is node-dns remote end point option.
 * { address: 'ip address', port: 'remote port number', type: 'udp or tcp'}
 * timeout is a number in milliseconds that is wait for the request to finish.
 *
 * @param {String} domain
 * @param {Array|String} type
 * @param {Object} opts
 * @returns {Number} timeout
 */
function requestDns(domain, type, option, timeout) {
    if(!type) type = 'A';

    let types = [],
        server = { address: '8.8.8.8', port: 53, type: 'tcp' };

    if(typeof type === 'string') types.push(type);
    if(type.length) types = type;

    return new Promise((resolve, reject) => {
        async.map(types, (type, callback) => {
            const question_opts = {
                name: domain,
                type: type
            };

            let requestOption = {
                question: dns.Question(question_opts),
                server: objectAssign(server, option),
                timeout: 3000,
                cache: false
            };

            if(timeout) requestOption.timeout = timeout;
            const request = dns.Request(requestOption);
            request.on('timeout', () => {
                callback(new Error('DNS request timed out'), null);
            });

            request.on('error', (error) => {
                callback(error, null);
            });

            request.on('message', (error, response) => {
                callback(error, response.answer);
            });

            request.send();
        },
        (error, results) => {
            if(error) {
                reject(error);
            } else {
                let response = {};

                Object.keys(results).map((value, index) => {
                    let key = types[index];

                    response[key] = results[value];
                });

                resolve(response);
            }
        });
    });
}

/**
 * Validate resource record type.
 *
 * @param {Array|String} types
 */
function validateDnsType(types) {
    if(!types || (types !== 'ANY' && typeof types.length !== 'number')) {
        throw new Error('Expected a `types is Array`');
    }

    let recordTypes,
        validTypes = [];

    if(types === 'ANY') {
        recordTypes = dnsTypes;
    } else {
        recordTypes = types;
    }

    recordTypes.forEach((type) => {
        var matched = dnsTypes.find(elem => {
            return type.toUpperCase() === elem;
        });

        if(matched) validTypes.push(matched);
    });

    return validTypes;
}

/**
 * FQDN Whois server and Whois domain.
 * First, Make the FQDN that was the TLD + whois-servers.net.
 *
 * @param {String} domain
 */
function requestWhois(domain, options) {
    let whoisServer, port, responseText;

    return new Promise((resolve, reject) => {
        var func = (domain, whoisServer, port) => {
                getWhoisDomain(domain, whoisServer, port)
                    .then(data => { resolve(data); })
                    .catch(error => { reject(error); });
            };

        if(options && options.server) {
            whoisServer = options.server;
            if(options.port) port = options.port;
            func.call(this, domain, whoisServer, port);
        } else {
            getWhoisServer(domain).then(whoisServers => {
                whoisServer = whoisServers[0];
                func.call(this, domain, whoisServer, port);
            }).catch((error) => {
                reject(error);
            });
        }
    });
}

/**
 * FQDN Whois Server.
 *
 * @param {String} domain
 */
function getWhoisServer(domain) {
    const tmp = domain.split('.'),
          tld = tmp[tmp.length -1],
          cname = tld + '.whois-servers.net',
          messege = { not_found: 'Whois Server `NOT FOUND`' };

    let server;

    return new Promise((resolve, reject) => {
        dns.resolveCname(cname, (error, servers) => {
            if(servers && servers.length > 0) {
                resolve(servers);
            } else {
                if(!error) error = messege.not_found
                reject(error);
            }
        });
    });
}

/**
 * Whois domain
 *
 * @param {String} domain
 * @param {String} server
 */
function getWhoisDomain(domain, server, port) {
    if(!domain) throw new Error('`domain` is required');
    if(!server) throw new Error('`server` is required');

    const socket = new net.Socket();
    const encoding = 'utf8'
    if(!port) { port = 43 }
    let responseText = '';

    return new Promise((resolve, reject) => {
        socket.setEncoding(encoding);

        socket.connect(port, server, () => {
            socket.end(domain + '\r\n', encoding);
        });

        socket.on('data', data => {
            resolve(data);
        });

        socket.on('error', error => {
            reject(error);
        });
    });
}

/**
 * IP address reverse.
 * support ipv4 only.
 *
 * @param {String} ip
 */
function reverse(ip) {
    if(!ipMatcher.test(ip)) {
        throw new Error('IP is not valid');
    }

    return new Promise((resolve, reject) => {
        dns.reverse(ip, (error, hostname) => {
            if(!error) {
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
 */
function decodePuny(ascii) {
    return punycode.toUnicode(ascii);
}

/**
 * Encode Punycode.
 *
 * @param {String} unicode
 */
function encodePuny(unicode) {
    return punycode.toASCII(unicode);
}

module.exports.groper = (domain, types, opts, cb) => {
    if (typeof domain !== 'string') throw new Error('Expected a `domain`');

    if(typeof types === 'function') cb = types;
    if(typeof opts === 'function') {
        cb = opts;
        opts = types;
    }

    const domainName = encodePuny(domain);
    let type, resourceTypes, server, timeout;

    if(typeof types === 'string') { resourceTypes = new Array(types); }
    if(Array.isArray(types)) { resourceTypes = types; }

    if(resourceTypes.indexOf('ANY') >= 0) {
        resourceTypes = 'ANY';
    }

    type = validateDnsType(resourceTypes);

    if(type.length === 0) {
        throw new Error('Valid No `DNS TYPE` exitst');
    }

    if(opts && opts.server) server = opts.server;
    if(opts && opts.timeout) timeout = opts.timeout;

    const promise = requestDns(domainName, type, server, timeout);

    if(cb && typeof cb === 'function') {
        promise
            .then(data => cb(null, data))
            .catch(error => cb(error, null));
    } else {
        return promise;
    }
}

module.exports.reverse = (ip, cb) => {
    if(typeof ip !== 'string') {
        throw new Error('Expected a `ip address`');
    }

    const promise = reverse(ip);

    if(cb && typeof cb === 'function') {
        promise
            .then(data => cb(null, data))
            .catch(error => cb(error, null));
    } else {
        return promise;
    }
}

module.exports.whois = (domain, opts, cb) => {
    if (typeof domain !== 'string') {
        throw new Error('Expected a `domain`');
    }

    if(typeof opts === 'function') cb = opts;

    if(tldjs.tldExists(domain) === false) {
        throw new Error('Invalid a `domain name`');
    }

    const encodedDomain = encodePuny(domain),
          promise = requestWhois(encodedDomain, opts);

    if(cb && typeof cb === 'function') {
        promise
            .then(data => cb(null, data))
            .catch(error => cb(error, null));
    } else {
        return promise;
    }
}

module.exports.punycode = (domain_or_string) => {
    const type = domain_or_string.match(/^xn--/)? 'decode' : 'encode';
    if(type === 'decode') {
        return decodePuny(domain_or_string);
    } else {
        return encodePuny(domain_or_string);
    }
}
