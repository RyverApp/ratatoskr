/// <reference path="../typings/tsd.d.ts" />

export interface Message {
    id?: string;
    type?: string;
}

export interface Ack {
    type: string;
    reply_to: string;
    reply_type: string;
}

export interface AuthMessage extends Message {
    authorization?: string;
}

export interface ChatMessage extends Message {
    to?: string;
    from?: string;
    text?: string;
}

export interface PresenceChangeMessage extends Message {
    to?: string;
    from?: string;
    presence?: string;
}

export interface UserTypingMessage extends Message {
    to?: string;
    from?: string;
}

export interface PingMessage extends Message {
    
}
