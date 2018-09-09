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
    name: string;
    type: string;
    class: string;
}
export declare const groper: (domain: string, types?: string | string[] | IdnsRequestParams | callbackFunction, options?: IdnsRequestParams | callbackFunction, cb?: callbackFunction) => any;
export declare const reverse: (ip: string, cb?: callbackFunction) => any;
export declare const whois: (domain: string, opts?: IwhoisServer | callbackFunction, cb?: callbackFunction) => any;
export declare const punycode: (ascii_or_unicode: string) => string;
export {};
