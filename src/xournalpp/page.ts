import {Image} from "./image";
import {Text} from "./text";
import {Stroke} from "./stroke";
import {Color, Element, RGBAColor} from "./utils";
import {TexImage} from "./teximage";

export enum BackgroundType {
    Solid = "solid"
}

export enum BackgroundStyle {
    Lined = "lined",
    Graph = "graph"
}

export class Background extends Element {
    color: RGBAColor;

    constructor(document: XMLDocument, type: BackgroundType = BackgroundType.Solid, color: Color | RGBAColor = Color.White, style: BackgroundStyle = BackgroundStyle.Graph) {
        super(document, "background");
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
    constructor(document: XMLDocument) {
        super(document, "layer");
    }

    set name(name: string) {
        this.element.setAttribute("name", name);
    }

    addStroke() {
        const stroke = new Stroke(this.document);
        this.element.appendChild(stroke.element);
        return stroke;
    }

    addImage(data: string, x: number, y: number, width: number, height: number) {
        const image = new Image(this.document, data, x, y, width, height);
        this.element.appendChild(image.element);
        return image;
    }

    addText() {
        const text = new Text(this.document);
        this.element.appendChild(text.element);
        return text;
    }

    addMath(text: string, data: string, x: number, y: number, width: number, height: number) {
        const math = new TexImage(this.document, text, data, x, y, width, height);
        this.element.appendChild(math.element);
        return math;
    }

    isEmpty() {
        return this.element.children.length === 0;
    }

    trim(){
        for(let child of this.element.children) {
            if(!child.innerHTML){
                this.element.removeChild(child);
            }
        }
    }
}


export class Page extends Element {
    private layers: Layer[] = [];
    constructor(document: XMLDocument, backgroundType: BackgroundType = BackgroundType.Solid, color: Color | RGBAColor = Color.White, style: BackgroundStyle = BackgroundStyle.Graph) {
        super(document, "page");
        const background: Background = new Background(document, backgroundType, color, style);
        this.element.appendChild(background.element);
    }

    set width(value: number) {
        this.element.setAttribute("width", value.toFixed(0));
    }

    set height(value: number) {
        this.element.setAttribute("height", value.toFixed(0));
    }

    addLayer() {
        const layer = new Layer(this.document);
        this.element.appendChild(layer.element);
        this.layers.push(layer);
        return layer;
    }

    trim() {
        for(const layer of this.layers) {
            layer.trim();
            if(layer.isEmpty()){
                this.element.removeChild(layer.element);
            }
        }
    }
}
