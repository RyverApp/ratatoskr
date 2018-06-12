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

export const PRESENCE_UNKNOWN = 'unknown';
export const PRESENCE_INACTIVE = 'inactive';
export const PRESENCE_ACTIVE = 'active';
export const PRESENCE_UNAVAILABLE = 'unavailable';
export const PRESENCE_AWAY = 'away';
export const PRESENCE_AVAILABLE = 'awailable';
export const PRESENCE_DND = 'dnd';

export type PresenceType = typeof PRESENCE_UNKNOWN | typeof PRESENCE_INACTIVE | typeof PRESENCE_ACTIVE | typeof PRESENCE_UNAVAILABLE |
    typeof PRESENCE_AWAY | typeof PRESENCE_AVAILABLE | typeof PRESENCE_DND;

export const PresenceTypes: { [type: string]: PresenceType } = Object.freeze({
    'UNKNOWN': PRESENCE_UNKNOWN as PresenceType,
    'INACTIVE': PRESENCE_INACTIVE as PresenceType,
    'ACTIVE': PRESENCE_ACTIVE as PresenceType,
    'UNAVAILABLE': PRESENCE_UNAVAILABLE as PresenceType,
    'AWAY': PRESENCE_AWAY as PresenceType,
    'AVAILABLE': PRESENCE_AVAILABLE as PresenceType,
    'DND': PRESENCE_DND as PresenceType,
});

export const PRESENCE_CLIENT_OTHER = 'other';
export const PRESENCE_CLIENT_WEB = 'web';
export const PRESENCE_CLIENT_PHONE = 'phone';

export type PresenceClientType = typeof PRESENCE_CLIENT_OTHER | typeof PRESENCE_CLIENT_WEB | typeof PRESENCE_CLIENT_PHONE;

export const PresenceClientTypes: { [client: string]: PresenceClientType } = Object.freeze({
    'OTHER': PRESENCE_CLIENT_OTHER as PresenceClientType,
    'WEB': PRESENCE_CLIENT_WEB as PresenceClientType,
    'PHONE': PRESENCE_CLIENT_PHONE as PresenceClientType
});

export interface PresenceChange {
    type: 'presence_change',
    id?: string;
    to: string;
    from?: string;
    presence: PresenceType;
    message?: string;
    client?: PresenceClientType;
}

export interface VoiceChange {
    type: 'voice_change',
    id?: string;
    to: string;
    from?: string;
    voice: string;
}

export interface UserTyping {
    type: 'user_typing',
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

export type Outbound = Auth | Chat | PresenceChange | VoiceChange | UserTyping | Ping | TeamJoin | TeamLeave | Other;
export type Inbound = Ack | Error | Other;
