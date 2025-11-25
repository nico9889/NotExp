import {StrokeComponents} from "./stroke";
import {ChronoComponents} from "./chrono";
import {RGB} from "./utils";

export interface FileContent {
    version: string;
    data: Data;
}

interface Data {
    engine_snapshot: EngineSnapshot;
}

interface EngineSnapshot {
    document: Document;
    camera: Camera;
    stroke_components: StrokeComponents;
    chrono_components: ChronoComponents;
    chrono_counter: number;
}

interface Document{
    config: Config;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Config{
    format: Format;
    background: Background;
    layout: "infinite"; // TODO: expand type
}

interface Format{
    width: number;
    height: number;
    dpi: number;
    orientation: "portrait" | "landscape";
    border_color: RGB;
    show_borders: boolean;
    show_origin_indicator: boolean;
}

interface Background{
    color: RGB;
    pattern: string; // TODO: restrict
    pattern_size: [number, number];
    pattern_color: RGB;
}