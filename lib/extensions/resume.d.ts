/// <reference path="../../typings/index.d.ts" />
import { Client } from '../client';
export interface ResumeOptions {
    ping?: number;
    retry?: number;
    steps?: Array<number>;
}
export declare function resume({ping, retry, steps}?: ResumeOptions): (client: Client) => void;
