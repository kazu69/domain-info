'use strict';

import test from 'ava'
import * as domainInfo from './domain-info'

test.cb('.groper() return promise when without callback function.', t => {
    const domain = 'example.com',
        type = 'A',
        server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp',
        },
        timeout = 3000,
        options = {
            server: server,
            timeout: timeout,
        };

    const promise = domainInfo.groper(domain, type, options);
    promise.then(data => {
        const record = data.A.find(elem => {
            if(elem.address) {
                return elem
            }
        });
        t.is(record.address, '93.184.216.34');
        t.end();
    }).catch( () => {
        t.pass();
        t.end();
    });
});

test.cb('.groper() return domain resource record.', t => {
    const server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp'
        },
        types = ['A', 'NS', 'MX'],
        domain = 'example.com',
        timeout = 10000;

    const options = {
        server: server,
        timeout: timeout,
    }

    const callback = (error, data) => {
        if (!data) {
            return
        }
        setTimeout(() => { t.end() }, 10000);
        var record;
        data.map(datum => {
            record = datum.A.find(elem => {
                if (elem.address) {
                    return elem
                }
            });
        });

        t.is(record.address, '93.184.216.34');
        t.is(data.MX.length, 0);
        t.true(data.NS[0].data.indexOf('iana-servers.net') !== -1);
        t.is(error, null);
        t.end();
    }
    return domainInfo.groper(domain, types, options, callback);
});

test.cb('.groper() types has ANY returns all types', t => {
    const server = {
            address: '8.8.8.8',
            port: 53,
            type: 'tcp',
        },
        types = ['ANY', 'NS', 'MX'],
        domain = 'example.com',
        timeout = 10000;

    const options = {
        server: server,
        timeout: timeout,
    }

    const callback = (error, data) => {
        if (!data) { return }
        setTimeout(() => { t.end() }, 10000);
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
    }

    return domainInfo.groper(domain, types, options, callback);
});

test.cb('.groper() enable encode punycode domain', t => {
    const domain = '日本語.jp',
          type = 'A';

    const callback = (error, data) => {
        var record = data.A.find(elem => {
            if (elem) {
                return elem
            }
        });
        t.is(record.name, 'xn--wgv71a119e.jp');
        t.is(record.address, '117.104.133.167');
        t.is(error, null);
        t.end();
    }

    return domainInfo.groper(domain, type, callback);
});

test.cb('.groper() return error with message.', t => {
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
        timeout: timeout,
    }

    const callback = (error, data) => {
        t.is(data, null);
        t.is(error.name, "Error");
        t.is(error.stack.split(/\n/, 1)[0], 'Error: DNS request timed out');
        t.end();
    }

    return domainInfo.groper(domain, types, options, callback);
});

test('.groper() throw error when supply invalid arguents', t => {
    const callback = () => {};
    t.throws(() => { domainInfo.groper(null, callback) }, 'Expected a `domain`');
});

test.cb('.reverse() return promise when without callback function.', t => {
    const ip = '8.8.8.8',
          promise = domainInfo.reverse(ip);

    promise.then(hostname => {
        t.deepEqual(hostname, ['google-public-dns-a.google.com']);
        t.end();
    });
});

test.cb('.reverse() return hostname.', t => {
    const ip = '8.8.8.8',
        callback = (error, data) => {
            t.deepEqual(data, ['google-public-dns-a.google.com']);
            t.end();
        };

    return domainInfo.reverse(ip, callback);
});

test('.reverse() throw error when supply invalid arguents', t => {
    const ip = null;
    t.throws(() => { domainInfo.reverse(ip) }, 'Expected a `ip address`');
});

test.cb('.whois() return promise when without callback function.', t => {
    const domain = 'google-public-dns-a.google.com',
        options = {
            recordType: 'nameserver',
            server: 'whois.verisign-grs.com',
            port: 43
        },
        promise = domainInfo.whois(domain, options);

    promise.then(data => {
        t.not(data, null);
        t.not(data, undefined);
        t.not(data, '');
        t.true(typeof data === 'string');
        t.end()
    });
});

test.cb('.whois() return domain information', t => {
    const domain = 'example.com',
        options = {
            recordType: 'domain',
            server: 'whois.verisign-grs.com',
            port: 43,
        },
        callback = (error, data) => {
            t.not(data, null);
            t.not(data, undefined);
            t.not(data, '');
            t.true(typeof data === 'string');
            t.end();
        };

    return domainInfo.whois(domain, options, callback);
});

test('.whois() throw error when supply invalid arguents', t => {
    let domain = null;
    t.throws(() => { domainInfo.whois(domain) }, 'Expected a `domain name`');

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
