declare module SASL {
    export interface Mechanism {
        name: string;
        clientFirst: boolean;
        new();
        response(cred: any): string;
        challenge(chal: any): Mechanism;
    }

    export interface Factory {
        new();
        use(name: string, mech: Mechanism);
        use(mech: Mechanism);
    }
}

declare module "saslmechanisms" {
    var Factory: SASL.Factory;
    export = Factory;
}

declare module "sasl-plain" {
    var Mechanism: SASL.Mechanism;
    export = Mechanism;
}
