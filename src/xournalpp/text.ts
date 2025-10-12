import {Color, RGBAColor, Element} from "./utils";

export class Text extends Element {
    constructor(
        document: XMLDocument,
        data: string = "",
        font: string = "Noto Sans",
        size: number = 12,
        x: number = 0,
        y: number = 0,
        color: RGBAColor | Color = new RGBAColor(0, 0, 0),
        // ts: number = 0,
        // fn: string = "",
    ) {
        super(document, "text");
        if (!(color instanceof RGBAColor)) {
            color = RGBAColor.fromColor(color);
        }
        this.element.setAttribute("font", font);
        this.element.setAttribute("size", size.toFixed(3));
        this.element.setAttribute("x", x.toFixed(4));
        this.element.setAttribute("y", y.toFixed(4));
        this.element.setAttribute("color", color.toString());

        this.element.innerText = data;
    }

    set size(size: number) {
        this.element.setAttribute("size", size.toFixed(3));
    }

    set font(font: string) {
        this.element.setAttribute("font", font);
    }

    set x(x: number) {
        this.element.setAttribute("x", x.toFixed(4));
    }

    set y(y: number) {
        this.element.setAttribute("y", y.toFixed(4));
    }

    set color(color: Color | RGBAColor) {
        if (!(color instanceof RGBAColor)) {
            color = RGBAColor.fromColor(color);
        }
        this.element.setAttribute("color", color.toString());
    }

    set data(data: string) {
        this.element.textContent = data;
    }
}