import {generateKeyBetween, BASE_62_DIGITS} from "@excalidraw/fractional-indexing";
import {FractionalIndex} from "@excalidraw/element/types";

export type IDGenerator = Generator<never, string, unknown>;

export function* idGenerator(): IDGenerator {
    const id = crypto.randomUUID();
    return id.slice(24, 32) + id.slice(0, 13)
}

export function getNonce() {
    return Number(String(Math.random()).replace(".", "").slice(0, 11));
}


// Gemini generated
function generateFractionalIndex(prev?: string, next?: string) {
    if (!prev && !next) {
        return "a0";
    } else if (!prev && next) {
        return generateBefore(next);
    } else if (prev && !next) {
        return generateAfter(prev);
    } else {
        return generateKeyBetween(prev, next);
    }
}

// Gemini generated
function generateAfter(lastIndex: string): string {
    const lastChar = lastIndex[lastIndex.length - 1];
    const pos = BASE_62_DIGITS.indexOf(lastChar);

    if (pos < BASE_62_DIGITS.length - 1) {
        return lastIndex.substring(0, lastIndex.length - 1) + BASE_62_DIGITS[pos + 1];
    }

    return lastIndex + BASE_62_DIGITS[Math.floor(BASE_62_DIGITS.length / 2)];
}

// Gemini generated
function generateBefore(firstIndex: string): string {
    const lastChar = firstIndex[firstIndex.length - 1];
    const pos = BASE_62_DIGITS.indexOf(lastChar);

    if (pos > 0) {
        return firstIndex.substring(0, firstIndex.length - 1) + BASE_62_DIGITS[pos - 1];
    }

    return firstIndex + BASE_62_DIGITS[Math.floor(BASE_62_DIGITS.length / 4)];
}

export class IndexGenerator {
    private last_index: FractionalIndex | undefined;

    next(): FractionalIndex {
        this.last_index = generateFractionalIndex(this.last_index, undefined) as FractionalIndex;
        return this.last_index ;
    }
}