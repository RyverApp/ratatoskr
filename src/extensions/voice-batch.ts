import { Client } from '../client';
import { VoiceChange } from '../interfaces';

export interface VoiceBatchOptions {
    timeout?: number;
}

export function voiceBatch({ timeout = 150 }: VoiceBatchOptions = {}) {
    return (client: Client) => {
        var batch: VoiceChange[] = [],
            batchTimeout: any;

        client.on('voice_change', (voice) => {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(voice);
            batchTimeout = setTimeout(publish, timeout);
        });

        function publish() {
            var data: VoiceChange[];
            data = batch, batch = [];
            client.emit('voice_change:batch', data);
        }
    };
}
