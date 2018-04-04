import { Client } from '../client';
import { PresenceChange } from '../interfaces.d';

export interface PresenceBatchOptions {
    timeout?: number;
}

export function presenceBatch({ timeout = 150 }: PresenceBatchOptions = {}) {
    return (client: Client) => {
        var batch: PresenceChange[] = [],
            batchTimeout: any;

        client.on('presence_change', (presence) => {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(presence);
            batchTimeout = setTimeout(publish, timeout);
        });

        function publish() {
            var data: PresenceChange[];
            data = batch, batch = [];
            client.emit('presence_change:batch', data);
        }
    };
}
