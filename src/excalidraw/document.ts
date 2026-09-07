import {ExcalidrawElement} from "@excalidraw/element/types";

export interface Zoom {
    value: number;
}

export interface AppState {
    gridSize?: number,
    gridStep?: number,
    gridModeEnabled?: boolean,
    viewBackgroundColor?: number,
    lockedMultiSelection?: {}, // TODO(nico9889): determine what is this
    scrollX?: number,
    scrollY?: number,
    zoom?: Zoom;
}

export interface File{
    mimeType: string,
    id: string,
    dataURL: string,
    created: number,
    lastRetrieved?: number,
}

export interface Files {
    [key: string]: File
}

export interface Document {
    type: "excalidraw",
    version: number,
    source: string,
    elements: ExcalidrawElement[];
    appState: AppState;
    files: Files
}