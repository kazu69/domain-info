'use strict';

const test = require('ava');
const domainInfo = require('../index');

test.cb('.groper() return promise when without callback function.', t => {
    const domain = 'example.com',
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

    const promise = domainInfo.groper(domain, type, options);
    promise.then(data => {
        var record = data.A.find(elem => {
            if(elem.address) return elem;
        });
         t.is(record.address, '93.184.216.34');
         t.end();
    }).catch( () => {
        t.pass();
        t.end();
    });
});

test('.groper() return domain resource record.', t => {
    const server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp'
        },
        types = ['A', 'NS', 'MX'],
        domain = 'example.com',
        timeout = 3000;

    const options = {
        server: server,
        timeout: timeout
    }

    const callback = (error, data) => {
        var record = data.A.find(elem => {
            if(elem.address) return elem;
        });
        t.is(record.address, '93.184.216.34');

        var record = data.MX;
        t.is(record.length, 0);

        var ns = data.NS.find(elem => {
            if(elem.data) return elem;
        });

        t.true(ns.data.indexOf('iana-servers.net') !== -1);
        t.is(error, null);
    }

    domainInfo.groper(domain, types, options, callback);
});

test('.groper() types has ANY returns all types', t => {
    const server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp'
        },
        types = ['ANY', 'NS', 'MX'],
        domain = 'example.com',
        timeout = 5000;

    const options = {
        server: server,
        timeout: timeout
    }

    const callback = (error, data) => {
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
    }

    domainInfo.groper(domain, types, options, callback);
});

test('.groper() enable encode punycode domain', t => {
    const domain = '日本語.jp',
          type = 'A';

    const callback = (error, data) => {
        var record = data.A.find(elem => {
            if(elem) return elem;
        });
        t.is(ecord.name, 'xn--wgv71a119e.jp');
        t.is(record.address, '117.104.133.167');
        t.is(error, null);
    }

    domainInfo.groper(domain, type, callback);
});

test('.groper() return error with message.', t => {
    const server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp'
        },
        types = ['A', 'CNAME', 'MX'],
        domain = 'example.com',
        timeout = 1;

    const options = {
        server: server,
        timeout: timeout
    }

    const callback = (error, data) => {
        t.is(data, null);
        t.is(error.name, "Error");
        t.is(error.stack.split(/\n/, 1)[0], 'Error: DNS request timed out');
        t.pass();
    }

    domainInfo.groper(domain, types, options, callback);
});

test('.groper() throw error when supply invalid arguents', t => {
    let domain = null,
        options = {},
        callback = (error, data) => {};
    t.throws(() => { domainInfo.groper(domain, callback) }, 'Expected a `domain`');
});

test('.reverse() return promise when without callback function.', t => {
    const ip = '8.8.8.8',
        promise = domainInfo.reverse(ip);

    return promise.then(hostname => {
        t.deepEqual(hostname, ['google-public-dns-a.google.com']);
    });
});

test.cb('.reverse() return hostname.', t => {
    const ip = '8.8.8.8',
        callback = (error, data) => {
            t.deepEqual(data, ['google-public-dns-a.google.com']);
            t.end();
        };

    domainInfo.reverse(ip, callback);
});

test('.reverse() throw error when supply invalid arguents', t => {
    const ip = null;
    t.throws(() => { domainInfo.reverse(ip) }, 'Expected a `ip address`');
});

test('.whois() return promise when without callback function.', t => {
    const domain = 'example.com',
        options = {
            server: 'whois.verisign-grs.com',
            port: 43
        },
        promise = domainInfo.whois(domain, options);

    return promise.then(data => {
        t.not(data, null);
        t.not(data, undefined);
        t.not(data, '');
        t.true(typeof data === 'string');
    });
});

test.cb('.whois() return domain information', t => {
    const domain = 'example.com',
        options = {
            server: 'whois.verisign-grs.com',
            port: 43
        },
        callback = (error, data) => {
            t.not(data, null);
            t.not(data, undefined);
            t.not(data, '');
            t.true(typeof data === 'string');
            t.end();
        };

    domainInfo.whois(domain, options, callback);
});

test('.whois() throw error when supply invalid arguents', t => {
    let domain = null;
    t.throws(() => { domainInfo.whois(domain) }, 'Expected a `domain`');

    domain = 'foobar.dummy';
    t.throws(() => { domainInfo.whois(domain) }, 'Invalid a `domain name`');
});

test('.punycode() return encoded string when supply unicode', t => {
    const domain = '日本語.jp',
          encoded = domainInfo.punycode(domain);

    t.is(encoded, 'xn--wgv71a119e.jp');
});

test('.punycode() return decoded string when supply ascii', t => {
    const domain = 'xn--wgv71a119e.jp',
          encoded = domainInfo.punycode(domain);

    t.is(encoded, '日本語.jp');
});
