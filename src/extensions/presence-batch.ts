import { Client } from '../client';
import { PresenceChange } from '../message-types';

export interface PresenceBatchOptions {
    timeout?: number;
}

export function presenceBatch({ timeout = 150 }: PresenceBatchOptions = {}) {
    return (client: Client) => {
        let batch: PresenceChange[] = [],
            batchTimeout: any;

        client.on('presence_change', (presence) => {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(presence);
            batchTimeout = setTimeout(publish, timeout);
        });

        function publish() {
            let data: PresenceChange[];
            data = batch, batch = [];
            client.emit('presence_change:batch', data);
        }
    };
}
