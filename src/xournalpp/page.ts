import {Color, Element, RGBAColor} from "./utils";

export enum BackgroundType {
    Solid = "solid"
}

export enum BackgroundStyle {
    Lined = "lined",
    Graph = "graph"
}

export class Background extends Element {
    color: RGBAColor;

    constructor(type: BackgroundType = BackgroundType.Solid, color: Color | RGBAColor = Color.White, style: BackgroundStyle = BackgroundStyle.Graph) {
        super("background");
        if (color instanceof RGBAColor) {
            this.color = color
        } else {
            this.color = RGBAColor.fromColor(color);
        }
        this.element.setAttribute("type", type);
        this.element.setAttribute("color", color.toString());
        this.element.setAttribute("style", style);
    }
}


export class Layer extends Element {
    constructor() {
        super("layer");
    }

    set name(name: string) {
        this.element.setAttribute("name", name);
    }

    trim() {
        for (let child of this.element.children) {
            if (!child.innerHTML) {
                this.element.removeChild(child);
            }
        }
    }
}


export class Page extends Element {
    constructor(backgroundType: BackgroundType = BackgroundType.Solid, color: Color | RGBAColor = Color.White, style: BackgroundStyle = BackgroundStyle.Graph) {
        super("page");
        const background: Background = new Background(backgroundType, color, style);
        this.element.appendChild(background.element);
    }

    set width(value: number) {
        this.element.setAttribute("width", value.toFixed(0));
    }

    set height(value: number) {
        this.element.setAttribute("height", value.toFixed(0));
    }
}
