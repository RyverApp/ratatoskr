// Type definitions for debug
// Project: https://github.com/visionmedia/debug
// Definitions by: Seon-Wook Park <https://github.com/swook>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

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
