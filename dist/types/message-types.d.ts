export interface Ack {
    type: 'ack';
    id?: string;
    reply_to: string;
    reply_type: string;
    response?: any;
    error?: any;
}
export interface Error {
    type: 'error';
    id?: string;
    code: string;
    text: string;
    data?: any;
}
export interface Other {
    type: string;
    id?: string;
}
export interface Auth {
    type: 'auth';
    id?: string;
    authorization: string;
    resource?: string;
    agent?: string;
}
export interface Chat {
    type: 'chat';
    id?: string;
    to: string;
    from?: string;
    text: string;
    extras?: any;
}
export interface PresenceChange {
    type: 'presence_change';
    id?: string;
    to: string;
    from?: string;
    presence: string;
}
export interface UserTyping {
    type: 'user_typing';
    id?: string;
    to: string;
    from?: string;
}
export interface Ping {
    type: 'ping';
    id?: string;
}
export interface TeamJoin {
    type: 'team_join';
    id?: string;
    to: string;
}
export interface TeamLeave {
    type: 'team_leave';
    id?: string;
    to: string;
}
export declare type Outbound = Auth | Chat | PresenceChange | UserTyping | Ping | TeamJoin | TeamLeave | Other;
export declare type Inbound = Ack | Error | Other;
