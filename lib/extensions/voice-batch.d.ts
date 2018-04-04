import { Client } from '../client';
export interface VoiceBatchOptions {
    timeout?: number;
}
export declare function voiceBatch({timeout}?: VoiceBatchOptions): (client: Client) => void;
