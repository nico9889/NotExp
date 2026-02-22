import {Color, Element, RGBAColor} from "./utils";

export enum Tool {
    Pen = "pen",
    Eraser = "eraser",
    Highlighter = "highlighter"
}

export class Stroke extends Element {
    constructor() {
        super( "stroke");
        this.element.setAttribute("tool", Tool.Pen);
        this.element.setAttribute("color", Color.Black);
        this.element.setAttribute("width", "12");
    }

    addPoint(x: number, y: number) {
        this.element.textContent = (this.element.textContent ?? "") + `${x.toFixed(4)} ${y.toFixed(4)} `;
    }

    set tool(tool: Tool) {
        this.element.setAttribute("tool", tool);
    }

    set color(color: Color | RGBAColor) {
        this.element.setAttribute("color", color.toString());
    }

    set width(width: number) {
        this.element.setAttribute("width", width.toString());
    }
}
