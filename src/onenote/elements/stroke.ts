import {Color} from "./colors";
import {round3} from "../../rnote/utils";
import {Offsets} from "../../adapters/rnote/rnote-adapter";
import {COLOR_REGEXP, LOG} from "../../adapters/converter";
import {OneNote} from "../onenote";

export interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class Stroke {
    readonly svg: SVGElement;
    readonly color: Color;
    readonly width: number;
    readonly directives: string[] | undefined;
    readonly viewBox: ViewBox;
    readonly offsets: Offsets;
    readonly scales: Offsets;
    readonly scale: number;

    constructor(document: OneNote, svg: SVGElement) {
        this.svg = svg;

        const path: SVGPathElement = svg.children[0] as SVGPathElement;

        const stroke = path.getAttribute("stroke");
        const colors = (stroke) ? COLOR_REGEXP.exec(stroke) : undefined;
        let [r,g,b,a] = [0,0,0,1];
        if (colors) {
            r = round3(Number(colors[1]) / 255);
            g = round3(Number(colors[2]) / 255);
            b = round3(Number(colors[3]) / 255);
        }

        const opacity = path.getAttribute("opacity");
        a = (opacity) ? Number(opacity) : 1;

        this.color = new Color(r,g,b,a, document.options.strokes_dark_mode);
        this.directives = path.getAttribute("d")?.split(" ");


        const view_box_string = svg.getAttribute("viewBox");
        const view_box_values = view_box_string?.split(" ");
        this.viewBox = {
            x: (view_box_values) ? Number(view_box_values[0]) || 0 : 0,
            y: (view_box_values) ? Number(view_box_values[1]) || 0 : 0,
            width: (view_box_values) ? Number(view_box_values[2]) || 0 : 0,
            height: (view_box_values) ? Number(view_box_values[3]) || 0 : 0,
        }

        this.offsets = {
            x: Number(svg.style.left.replace("px", "")) || 0,
            y: Number(svg.style.top.replace("px", "")) || 0
        }

        this.scales = {
            x: Number(svg.style.width.replace("px", "")) / this.viewBox.width,
            y: Number(svg.style.height.replace("px", "")) / this.viewBox.height
        }

        // FIXME: this isn't 100% accurate probably
        this.scale = (this.scales.x + this.scales.y) / 2;

        this.width = round3(Number(path.getAttribute("stroke-width")) * this.scale)
    }

    * points(): Generator<[number, number]> {
        if (!this.directives) return;
        const directives = this.directives;

        let [previous_x, previous_y] = [0, 0];

        for (let i = 0; i < directives.length; i++) {
            const directive = directives[i];

            if (directive === "M") {
                const x = round3((Number(directives[i + 1])- this.viewBox.x) * this.scales.x + this.offsets.x);
                const y = round3((Number(directives[i + 2])- this.viewBox.y) * this.scales.y + this.offsets.y);
                yield [
                    x,y
                ];
                previous_x = x;
                previous_y = y;
                i += 2;
            } else if (directive === "l") {
                i += 1;

                let next_x = previous_x + (parseInt(directives[i]) * this.scales.x);
                let next_y = previous_y + (parseInt(directives[i + 1]) * this.scales.y);

                while(!isNaN(next_x) && !isNaN(next_y)){
                    yield [round3(next_x), round3(next_y)];
                    i+=2;
                    next_x += (parseInt(directives[i]) * this.scales.x);
                    next_y += (parseInt(directives[i + 1]) * this.scales.y);
                }
                i -= 3;
            } else if (!directive.trim()) {
                // Added to avoid false warnings
            } else {
                // Skips unmanaged directives, warning the user that this value has been unused
                // so if it was useful it can be reported
                LOG.debug(`Skipping unrecognised stroke directive: ${directives[i]}`);
            }
        }
    }
}