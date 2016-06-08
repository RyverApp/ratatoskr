/// <reference path="../typings/index.d.ts" />
export interface Deferred {
    promise: Promise<any>;
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}
export declare function make(): Deferred;
export default make;
