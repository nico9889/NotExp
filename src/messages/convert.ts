import {Message} from "./index";

export enum MathQuality{
    Low=1,
    Medium=2,
    High=4
}

export enum DocumentFormat{
    xopp = "Xournal++ (XOPP)",
    xoz = "Xournal++ (XOZ)", // TODO: https://codeberg.org/nico9889/OneNote2Xournalpp
    rnote = "RNote" // Just an idea, implementation not planned
}

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

export enum Status{
    Ok = 0,
    Error = 1
}

export interface ProgressMessage extends Message {
    progress: number,
    status: Status
}