/// <reference path="../../typings/index.d.ts" />
import { Client } from '../client';
export interface ResumeOptions {
    ping?: number;
    retry?: number;
    steps?: Array<number>;
    jitter?: number;
}
export declare function resume({ping, retry, steps, jitter}?: ResumeOptions): (client: Client) => void;
