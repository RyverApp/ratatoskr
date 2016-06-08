import { Client } from '../client';
export interface ResumeOptions {
    ping?: number;
    retry?: number;
}
export declare function resume({ping, retry}?: ResumeOptions): (client: Client) => void;
