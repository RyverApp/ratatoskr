declare module Debug {
    export interface Factory {
        (namespace: string): Logger;
        enable(namespaces: string): void;
        disable(): void;
        enabled(namespace: string): boolean;
    }

    export interface Logger {
        (formatter: any, ...args: any[]): void;
        enabled:   boolean;
        log:       Function;
        namespace: string;
    }
}

declare module "debug" {
    var Factory: Debug.Factory;
    export = Factory;
}