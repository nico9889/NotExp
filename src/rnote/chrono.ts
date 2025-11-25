export type ChronoComponents = ChronoComponent[];

export interface ChronoComponent{
    value: Value | null;
    version: number;
}

interface Value{
    t: number;
    layer: Layer | "image" | "highlighter";
}

export interface Layer{
    user_layer: number;
}