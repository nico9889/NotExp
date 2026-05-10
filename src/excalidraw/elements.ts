export type IDGenerator = Generator<never, string, unknown>;

export function* idGenerator(): IDGenerator {
    const id = crypto.randomUUID();
    return id.slice(24, 32) + id.slice(0, 13)
}

export function getNonce() {
    return Number(String(Math.random()).replace(".","").slice(0,11));
}


// Gemini generated
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Gemini generated
function generateFractionalIndex(prev?: string, next?: string): string {
    if (!prev && !next) {
        return "a0";
    }

    if (!prev && next) {
        return generateBefore(next);
    }

    if (prev && !next) {
        return generateAfter(prev);
    }

    if (prev && next) {
        return generateBetween(prev, next);
    }

    return "a0";
}

// Gemini generated
function generateAfter(lastIndex: string): string {
    const lastChar = lastIndex[lastIndex.length - 1];
    const pos = DIGITS.indexOf(lastChar);

    if (pos < DIGITS.length - 1) {
        return lastIndex.substring(0, lastIndex.length - 1) + DIGITS[pos + 1];
    }

    return lastIndex + DIGITS[Math.floor(DIGITS.length / 2)];
}

// Gemini generated
function generateBefore(firstIndex: string): string {
    const lastChar = firstIndex[firstIndex.length - 1];
    const pos = DIGITS.indexOf(lastChar);

    if (pos > 0) {
        return firstIndex.substring(0, firstIndex.length - 1) + DIGITS[pos - 1];
    }

    return firstIndex + DIGITS[Math.floor(DIGITS.length / 4)];
}

// Gemini generated
function generateBetween(low: string, high: string): string {
    let i = 0;
    let result = "";

    while (true) {
        const charLow = low[i] || "0";
        const charHigh = high[i] || "z";

        const posLow = DIGITS.indexOf(charLow);
        const posHigh = DIGITS.indexOf(charHigh);

        if (posHigh - posLow > 1) {
            const midDigit = DIGITS[Math.floor((posLow + posHigh) / 2)];
            return result + midDigit;
        }

        result += charLow;
        i++;

        if (i >= low.length && posHigh - DIGITS.indexOf("0") > 1) {
            return result + DIGITS[Math.floor(DIGITS.length / 2)];
        }
    }
}

export class IndexGenerator{
    private last_index: string | undefined;

    next(){
        this.last_index = generateFractionalIndex(this.last_index, undefined);
        return this.last_index;
    }
}

export interface Roundness {
    value: number;
}

export interface Element {
    id: string,
    type: "diamond" | "image" | "freedraw";
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number,
    strokeColor: string,
    backgroundColor: string,
    fillStyle: "solid",
    strokeSharpness?: "sharp" | "round",
    strokeWidth: number,
    strokeStyle: "solid",
    roughness: number,
    opacity: number,
    frameId: null,
    index: string,
    roundness: Roundness | null,
    seed: number,
    version: number,
    versionNonce: number,
    isDeleted: boolean,
    boundElements: [] | null,
    updated: number,
    link: null,
    locked: boolean,
    fileId?: string,
    status?: "saved" | "pending",
    scale?: [number, number],
    crop?: null,
    points?: [number, number][],
    pressures?: [],
    groupIds?:  [],
}