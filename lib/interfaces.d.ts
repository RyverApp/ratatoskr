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
export declare const PRESENCE_UNKNOWN = "unknown";
export declare const PRESENCE_INACTIVE = "inactive";
export declare const PRESENCE_ACTIVE = "active";
export declare const PRESENCE_UNAVAILABLE = "unavailable";
export declare const PRESENCE_AWAY = "away";
export declare const PRESENCE_AVAILABLE = "available";
export declare const PRESENCE_DND = "dnd";
export declare type PresenceType = typeof PRESENCE_UNKNOWN | typeof PRESENCE_INACTIVE | typeof PRESENCE_ACTIVE | typeof PRESENCE_UNAVAILABLE | typeof PRESENCE_AWAY | typeof PRESENCE_AVAILABLE | typeof PRESENCE_DND;
export declare const PresenceTypes: {
    [type: string]: PresenceType;
};
export declare const PRESENCE_CLIENT_OTHER = "other";
export declare const PRESENCE_CLIENT_WEB = "web";
export declare const PRESENCE_CLIENT_PHONE = "phone";
export declare type PresenceClientType = typeof PRESENCE_CLIENT_OTHER | typeof PRESENCE_CLIENT_WEB | typeof PRESENCE_CLIENT_PHONE;
export declare const PresenceClientTypes: {
    [client: string]: PresenceClientType;
};
export interface PresenceChange {
    type: 'presence_change';
    id?: string;
    to: string;
    from?: string;
    presence: PresenceType;
    message?: string;
    client?: PresenceClientType;
}
export interface VoiceChange {
    type: 'voice_change';
    id?: string;
    to: string;
    from?: string;
    voice: string;
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
export interface MarkRead {
    type: 'mark_read';
    id?: string;
    to: string;
    key: string;
}
export declare type Outbound = Auth | Chat | PresenceChange | VoiceChange | UserTyping | Ping | TeamJoin | TeamLeave | MarkRead | Other;
export declare type Inbound = Ack | Error | Other;
