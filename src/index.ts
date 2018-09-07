import * as dns from 'native-dns'
import net from 'net'
import puny from 'punycode'
import tldjs from 'tldjs'

const topLevelWhoisServerDomai = 'whois-servers.net'

type callbackFunction = (err: Error | null | undefined, data: any) => any

interface IwhoisServer {
    recordType?: string
    server?: string
    port?: number
}

interface IdnsServer {
    address: string
    port: number
    type: string
}

interface IdnsResponse {
    [type: string]: IdnsAnswer
}

interface IdnsRequestParams {
    question?: IdnsQuestionResponse
    server?: IdnsServer
    timeout?: number
    cache?: boolean
}

interface IdnsQuestionResponse {
    name?: string
    type: string
    class: string
}

interface IdnsAnswer {
    name: string
    type: number
    class: number
    ttl: number
    address?: string
    data?: string | string[]
}

const dnsTypes: string[] = [
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
    'TLSA',
]

const ipMatcher: RegExp = /^(?:(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)\.){3}(?:2[0-4]\d|25[0-5]|1\d{2}|[1-9]?\d)$/
const defaultDnsServer: IdnsServer = {
    address: '1.1.1.1',
    port: 53,
    type: 'tcp',
}
const defaultTimeout = 3000

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
function requestDns(domain: string, types?: string[], option?: IdnsServer, timeout?: number): Promise<any> {
    const promises: Array<Promise<any>> = []

    let recordTypes: string[] = []

    if (!types || types.length === 0) {
        recordTypes = ['A']
    } else {
        recordTypes = types
    }

    recordTypes.map((type) => {
        promises.push(ajaxRequest(domain, type, option, timeout))
    })

    return new Promise((resolve, reject) => {
        Promise
            .all(promises)
            .then((values) => {
                const response: {
                    [x: string]: IdnsAnswer[],
                } = {}

                values.map((obj) => {
                    Object.keys(obj).map((k) => { response[k] = obj[k] })
                })
                resolve(response)
            })
            .catch((err) => {
                reject(err)
            })
    })
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
function ajaxRequest(domain: string, type: string, dnsServer?: IdnsServer, timeout: number = defaultTimeout): Promise<any> {
    const server: IdnsServer = defaultDnsServer

    return new Promise((resolve, reject) => {
        const questionOpts = {
            name: domain,
            type,
        }

        const requestOption: IdnsRequestParams = {
            cache: false,
            question: dns.Question(questionOpts),
            server: Object.assign(server, dnsServer),
            timeout,
        }

        if (timeout) { requestOption.timeout = timeout }
        const request = dns.Request(requestOption)

        request.on('timeout', () => {
            reject(new Error('DNS request timed out'))
        })

        request.on('cancelled', () => {
            reject(new Error('DNS request cancelled'))
        })

        request.on('error', (error: Error) => {
            reject(error)
        })

        request.on('message', (_: Error, response: any) => {
            resolve({
                [type]: response.answer,
            })
        })

        request.send()
    })
}

/**
 * Validate resource record type.
 *
 * @param {Array|String} types
 * @return {Array}
 */

function validateDnsType(types?: string | string[]): string[] {
    if (!types || (types !== 'ANY' && typeof types.length !== 'number')) {
        throw new Error('Expected a `types is Array`')
    }

    let recordTypes: string[]
    const validTypes: string[] = []

    if (types === 'ANY' || types.includes('ANY')) {
        recordTypes = dnsTypes
    } else {
        if (typeof types === 'string') {
            recordTypes = [types]
        } else {
            recordTypes = types
        }
    }

    recordTypes.forEach((type) => {
        const matched = dnsTypes.find( elem => {
            return type.toUpperCase() === elem
        })

        if (typeof matched === 'string') {
            validTypes.push(matched)
        }
    })

    return validTypes
}

/**
 * Get Whois server and Whois domain.
 * First, Make the FQDN that was the TLD + whois-servers.net.
 *
 * @param {String} domain
 * @param {Object} options
 * @return {Promise}
 */
function requestWhois(domain: string, options?: any): Promise<any> {
    let whoisServer: string,
        port: number

    return new Promise((resolve, reject) => {
        const func = (domain: string, whoisServer: string, port: number) => {
            getWhoisDomain(domain, whoisServer, port)
                .then((data) => { resolve(data) })
                .catch((error) => { reject(error) })
        }

        if (options && options.server) {
            whoisServer = options.server
            if (options.port) { port = options.port }
            func.call(null, domain, whoisServer, port)
        } else {
            getTopLevelWhoisServer(domain).then((whoisServers) => {
                whoisServer = whoisServers[0]
                func.call(null, domain, whoisServer, port)
            }).catch((error) => {
                reject(error)
            })
        }
    })
}

/**
 * Get the whois server of the top level domain
 *
 * @param {String} domain
 * @return {Promise}
 */
function getTopLevelWhoisServer(domain: string): Promise<any> {
    const tmp = domain.split('.'),
        tld = tmp[tmp.length - 1],
        cname = `${tld}.${topLevelWhoisServerDomai}`,
        messege = { not_found: 'Whois Server `NOT FOUND`' }

    return new Promise((resolve, reject) => {
        dns.resolveCname(cname, (error: Error, servers: any) => {
            if (servers && servers.length > 0) {
                resolve(servers)
            } else {
                !error ? reject(messege.not_found) : reject(error)
            }
        })
    })
}

/**
 * Get whois information of the domain
 *
 * @param {String} domain
 * @param {String} server
 * @return {Promise}
 */
function getWhoisDomain(domain: string, server: string, port = 43): Promise<any> {
    if (!domain) { throw new Error('`domain` is required') }
    if (!server) { throw new Error('`server` is required') }

    const socket = new net.Socket()
    const encoding = 'utf8'

    return new Promise((resolve, reject) => {
        socket.setEncoding(encoding)

        socket.connect(port, server, () => {
            socket.end(domain + '\r\n', encoding)
        })

        socket.on('data', (data) => {
            resolve(data)
        })

        socket.on('error', (error) => {
            reject(error)
        })
    })
}

/**
 * IP address reverse.
 * support ipv4 only.
 *
 * @param {String} ip
 * @return {Promise}
 */
function reverseDomain(ip: string): Promise<string> {
    if (!ipMatcher.test(ip)) {
        throw new Error('IP is not valid')
    }

    return new Promise((resolve, reject) => {
        dns.reverse(ip, (error: Error, hostname: string) => {
            if (reverse) {
                resolve(hostname)
            } else {
                reject(error)
            }
        })
    })
}

/**
 * Decode Punycode.
 *
 * @param {String} ascii
 * @return {String}
 */
function decodePuny(ascii: string): string {
    return puny.toUnicode(ascii)
}

/**
 * Encode Punycode.
 *
 * @param {String} unicode
 * @return {String}
 */
function encodePuny(unicode: string): string {
    return puny.toASCII(unicode)
}

export const groper = (domain: string, types?: any, options?: IdnsRequestParams, cb?: callbackFunction): Promise<any> | void => {
    if (typeof domain !== 'string') { throw new Error('Expected a `domain`') }

    const defaultOptions: IdnsRequestParams = {
        server: defaultDnsServer,
        timeout: defaultTimeout,
    }

    let callback: callbackFunction
    let requestOptions: IdnsRequestParams = defaultOptions

    if (typeof types === 'function') {
        callback = types
    } else if (typeof options === 'function') {
        callback = options
        requestOptions = Object.assign(defaultOptions, cb)
    } else if (cb) {
        requestOptions = Object.assign(defaultOptions, options)
        callback = cb
    }

    const domainName = encodePuny(domain)
    let type, server, timeout, resourceTypes = ['ANY']

    if (typeof types === 'string') { resourceTypes = new Array(types) }
    if (Array.isArray(types)) { resourceTypes = types }
    if (resourceTypes.includes('ANY')) { resourceTypes = ['ANY'] }

    type = validateDnsType(resourceTypes)

    if (type.length === 0) {
        throw new Error('Valid No `DNS TYPE` exitst')
    }

    if (requestOptions.server) { server = requestOptions.server }
    if (requestOptions.timeout) { timeout = requestOptions.timeout }
    const promise = requestDns(domainName, type, server, timeout)

    if (callback && typeof callback === 'function') {
        promise
            .then((data) => callback(null, data))
            .catch((error) => callback(error, null))
    } else {
        return promise
    }
}

export const reverse = (ip: string, cb: callbackFunction): Promise<string> | void => {
    if (typeof ip !== 'string') {
        throw new Error('Expected a `ip address`')
    }

    const promise = reverseDomain(ip)

    if (cb && typeof cb === 'function') {
        promise
            .then((data) => cb(null, data))
            .catch((error) => cb(error, null))
    } else {
        return promise
    }
}

export const whois = (domain: string, opts?: IwhoisServer, cb?: callbackFunction): Promise<any> | void => {
    if (typeof domain !== 'string') {
        throw new Error('Expected a `domain name`')
    }

    let callback: callbackFunction

    if (typeof opts === 'function') {
        callback = opts
    } else {
        callback = cb
    }

    if (tldjs.tldExists(domain) === false) {
        throw new Error('Invalid a `domain name`')
    }

    const encodedDomain = `${encodePuny(domain)}`,
        promise = requestWhois(encodedDomain, opts)

    if (callback && typeof callback === 'function') {
        promise
            .then((data) => callback(null, data))
            .catch((error) => callback(error, null))
    } else {
        return promise
    }
}

export const punycode = (ascii_or_unicode: string): string => {
    const type = ascii_or_unicode.match(/^xn--/) ? 'decode' : 'encode'
    if (type === 'decode') {
        return decodePuny(ascii_or_unicode)
    } else {
        return encodePuny(ascii_or_unicode)
    }
}
