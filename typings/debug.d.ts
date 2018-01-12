declare namespace debug {
    export interface IDebug {
        (namespace: string): IDebugger,
        coerce: (val: any) => any,
        disable: () => void,
        enable: (namespaces: string) => void,
        enabled: (namespaces: string) => boolean,

        names: string[],
        skips: string[],

        formatters: IFormatters
    }

    export interface IFormatters {
        [formatter: string]: Function
    }

    export interface IDebugger {
        (formatter: any, ...args: any[]): void;

        enabled: boolean;
        log: Function;
        namespace: string;
    }
}

declare module "debug" {
    var dbg: debug.IDebug;
    export = dbg;
}