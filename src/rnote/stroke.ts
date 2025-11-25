import {RGB} from "./utils";
import {TextStroke} from "./text";
import {BitMapImage} from "./image";

export type StrokeComponents = StrokeComponent[];

export interface StrokeComponent{
    value: Value | null;
    version: number;
}

export interface Value{
    brushstroke: BrushStroke | undefined;
    textstroke: TextStroke | undefined;
    bitmapimage: BitMapImage | undefined;
}

export interface BrushStroke{
    path: Path;
    style: Style;
}

export interface Path{
    start: Start;
    segments: Segment[];
}

export interface Start{
    pos: [number, number];
    pressure: number;
}

export interface Segment{
    lineto: LineTo;
}

export interface LineTo{
    end: End;
}

export interface End{
    pos: [number, number];
    pressure: number;
}

export interface Style{
    smooth: Smooth;
}

export interface Smooth{
    stroke_width: number;
    stroke_color: RGB;
    fill_color: RGB;
    pressure_curve: "linear"; // TODO: expand
    line_style: "solid"; // TODO: expand
    line_cap: "straight"; // TODO: expand
}