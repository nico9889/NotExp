import {RGB} from "./utils";

export interface TextStroke {
    text: string;
    transform: Transform;
    text_style: TextStyle;
}

export interface Transform {
    affine: [number, number, number, number, number, number, number, number, number]
}

export interface TextStyle {
    font_family: string;
    font_size: number;
    font_weight: number;
    font_style: string;
    color: RGB;
    max_width: number;
    alignment: "start" | "center" | "end";
    ranged_text_attributes: string[]; // TODO: ???
}