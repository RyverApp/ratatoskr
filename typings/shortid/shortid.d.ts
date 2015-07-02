declare module "shortid" {
    export function generate(): string;
    export function characters(chars: string): string;
    export function isValid(id: string): boolean;
    export function woker(id: number);
    export function seed(id: number);
}
