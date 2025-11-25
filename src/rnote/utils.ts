export interface RGB {
    r: number;
    g: number;
    b: number;
    a: number;
}

export namespace Colors {
    export const Black: RGB = {r: 0, g: 0, b: 0, a: 1};
    export const White: RGB = {r: 1, g: 1, b: 1, a: 1};
}

export function round3(n: number) {
    return Math.round(n * 1000) / 1000;
}