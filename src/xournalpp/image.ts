import {Element} from "./utils";

export class Image extends Element {
    public right: number;
    public bottom: number;

    constructor(data: string, x: number, y: number, width: number, height: number, element_name: "image" | "teximage" = "image") {
        super(element_name);
        this.right = x + width;
        this.bottom = y + height;
        this.element.setAttribute("left", x.toFixed(3));
        this.element.setAttribute("right", this.right.toFixed(3));
        this.element.setAttribute("top", y.toFixed(3));
        this.element.setAttribute("bottom", this.bottom.toFixed(3));
        this.element.textContent = data;
    }
}