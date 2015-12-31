# domain-info

[![Build Status](https://travis-ci.org/kazu69/domain-info.svg?branch=master)](https://travis-ci.org/kazu69/domain-info)

Simple domain infomation client.

## install

```sh
npm install domain-info
```

## Usage

```js
const domain = require('domain-info');
const callback = (error, data) => {
    console.log(data);
}

domain.groper('github.com', { type: ['A'] }, callback);
// data = { A:
//    [ { name: 'github.com',
//        type: 1,
//        class: 1,
//        ttl: 20,
//        address: '192.30.252.130' } ]
// }
```

This module return Promise object without callback function.

```js
const domain = require('domain-info');

let promise = domain.groper('github.com', { type: ['A'] });
promise.then(data => {
// data = { A:
//    [ { name: 'github.com',
//        type: 1,
//        class: 1,
//        ttl: 20,
//        address: '192.30.252.130' } ]
// }
});
```

## API

### groper(domain, [type, option, callback])

Dig command.
Option is [node-dns](https://github.com/tjfontaine/node-dns#request) Request method option.
```type``` is resource record type like ```A```, ```MX```.

```js
const domain = require('domain-info');
domain.groper(
    'example.com',
    {
        type: ['A', 'NS', 'MX'],
        server: { address: '8.8.8.8', port: 53, type: 'udp' },
        timeout: 1000
    },
    callback
);
```

### reverse(ip_address, [callback])

Reverse DNS lookup.

```js
const domain = require('domain-info');
domain.reverse('8.8.8.8', (error, data) => {
    // data => [ 'google-public-dns-a.google.com' ]
});
```

### whois(domain, [option, callback])
Whois command.
Option has ```server``` and ```port``` properties.

```js
const domain = require('domain-info');
domain.whois('example.com', (error, data) => {
    // data has whois results.
});
```

### punycode(ascii_or_unicode)

Convert ascii domain to uicode.
Also convert unicode domain to ascii in reverse.

```js
const domain = require('domain-info');

domain.punycode('日本語.jp');
// => xn--wgv71a119e.jp

domain.punycode('xn--wgv71a119e.jp');
// => 日本語.jp
```

## Related

[domain-info-cli](https://www.npmjs.com/package/domain-info-cli)

## License

MIT © kazu69
