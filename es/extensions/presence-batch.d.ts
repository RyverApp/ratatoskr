import { Client } from '../client';
export interface PresenceBatchOptions {
    timeout?: number;
}
export declare function presenceBatch({timeout}?: PresenceBatchOptions): (client: Client) => void;
