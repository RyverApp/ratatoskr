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

export interface ErrorMessage extends Message {
    code: string;
    text: string;
}

export interface AuthMessage extends Message {
    authorization?: string;
    resource?: string;
    agent?: string;
}

export interface ChatMessage extends Message {
    to: string;
    from?: string;
    text: string;
    extras?: any;
}

export interface PresenceChangeMessage extends Message {
    to: string;
    from?: string;
    presence: string;
}

export interface UserTypingMessage extends Message {
    to: string;
    from?: string;
}

export interface PingMessage extends Message {

}

export interface TeamJoinMessage extends Message {
    to: string;
}

export interface TeamLeaveMessage extends Message {
    to: string;
}
