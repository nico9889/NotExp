import {Color} from "./colors";
import {round3} from "../../rnote/utils";
import {Offsets} from "../../adapters/rnote/rnote-adapter";
import {COLOR_REGEXP, LOG} from "../../adapters/converter";

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

    constructor(svg: SVGElement) {
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

        this.color = new Color(r,g,b,a);
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
                const x = Number(directives[i + 1]);
                const y = Number(directives[i + 2]);
                yield [
                    round3((x - this.viewBox.x) * this.scales.x + this.offsets.x),
                    round3((y - this.viewBox.y) * this.scales.y + this.offsets.y)
                ];
                previous_x = x;
                previous_y = y;
                i += 2;
            } else if (directive === "l") {
                let x = parseInt(directives[i + 1]);
                let y = parseInt(directives[i + 2]);
                i += 3;

                // Continue to scan the line value two number at times, if a number is invalid, it resets the
                // index position and continue with normal scan looking for other directives
                while (!isNaN(x) && !isNaN(y)) {
                    const next_x = previous_x + (x * this.scales.x);
                    const next_y = previous_y + (y * this.scales.y);

                    yield [round3(next_x), round3(next_y)];

                    previous_x = x;
                    previous_y = y;
                    x = parseInt(directives[i]);
                    y = parseInt(directives[i + 1]);
                    i += 2;
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