import {Message} from "./index";

export enum MathQuality {
    Low = 1,
    Medium = 2,
    High = 4
}

export enum DocumentFormat {
    xopp = 0,
    xoz = 1, // TODO: https://codeberg.org/nico9889/OneNote2Xournalpp
    rnote = 10
}

export function formatToString(format: DocumentFormat){
    switch(format){
        case DocumentFormat.xopp:
            return "Xournal++ (.xopp)";
        case DocumentFormat.xoz:
            return "Xournal++ (.xoz)";
        case DocumentFormat.rnote:
            return "RNote (.rnote)";
    }
}

export const implementedFormats = [DocumentFormat.xopp, DocumentFormat.rnote];

export interface ConvertMessage extends Message {
    format: DocumentFormat,
    filename: string,
    images: boolean,
    texts: boolean,
    maths: boolean,
    strokes: boolean,
    separateLayers: boolean,
    dark_page: boolean,
    strokes_dark_mode: boolean,
    texts_dark_mode: boolean,
    math_dark_mode: boolean
    math_quality: MathQuality
}

export enum Status {
    Ok = 0,
    Error = 1
}

export interface ProgressMessage extends Message {
    progress: number,
    status: Status
}