declare type callbackFunction = (err: Error | null | undefined, data: any) => any;
interface IwhoisServer {
    recordType?: string;
    server?: string;
    port?: number;
}
interface IdnsServer {
    address: string;
    port: number;
    type: string;
}
interface IdnsRequestParams {
    question?: IdnsQuestionResponse;
    server?: IdnsServer;
    timeout?: number;
    cache?: boolean;
}
interface IdnsQuestionResponse {
    name?: string;
    type: string;
    class: string;
}
export declare const groper: (domain: string, types?: any, options?: IdnsRequestParams, cb?: callbackFunction) => void | Promise<any>;
export declare const reverse: (ip: string, cb: callbackFunction) => void | Promise<string>;
export declare const whois: (domain: string, opts?: IwhoisServer, cb?: callbackFunction) => void | Promise<any>;
export declare const punycode: (ascii_or_unicode: string) => string;
export {};
