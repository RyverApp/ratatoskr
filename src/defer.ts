/// <reference path="../typings/tsd.d.ts" />

import {Promise} from 'es6-promise';

export interface Deferred {
    promise: Promise<any>;
    resolve: (value?: any) => void; 
    reject: (reason?: any) => void;
}

export function make(): Deferred {
    var def: any = {};

    def.promise = new Promise((resolve, reject) => {
        def.resolve = resolve;
        def.reject = reject;
    });

    return def;
}

export default make;
