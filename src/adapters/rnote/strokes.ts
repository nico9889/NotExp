import {RGB, Colors, round3} from "../../rnote/utils";
import {COLOR_REGEXP, LOG} from "../converter";
import {PageSize} from "./rnote-adapter";
import {StrokeComponent} from "../../rnote/stroke";
import {File} from "../../rnote/file";

export function convertStrokes(panel: HTMLDivElement, file: File, dark_mode: boolean, page_size: PageSize): StrokeComponent[] {
    LOG.info("Converting strokes");
    const converted_strokes: StrokeComponent[] = [];
    const strokes = panel.getElementsByClassName("InkStrokeOuterElement") as HTMLCollectionOf<SVGElement>;
    LOG.info(`Found ${strokes.length} stroke(s)`);
    const base_color: RGB = (dark_mode) ? Colors.White : Colors.Black;

    for (const stroke of strokes) {
        // SVG ViewBox, shifts the stroke into a specific direction
        const view_box_string = stroke.getAttribute("viewBox");
        const view_box_values = view_box_string?.split(" ");
        const view_box = {
            x: (view_box_values) ? Number(view_box_values[0]) || 0 : 0,
            y: (view_box_values) ? Number(view_box_values[1]) || 0 : 0,
            width: (view_box_values) ? Number(view_box_values[2]) || 0 : 0,
            height: (view_box_values) ? Number(view_box_values[3]) || 0 : 0,
        }

        const scale_x = Number(stroke.style.width.replace("px", "")) / view_box.width;
        const scale_y = Number(stroke.style.height.replace("px", "")) / view_box.height;
        // FIXME: this isn't 100% accurate probably
        const stroke_scale = (scale_x + scale_y) / 2;


        // Every stroke for some reason is shifted three times: one external, by SVG style and viewbox property,
        // and one internal, by a large movement in the path ("M n n") in the opposite direction
        // We need this offset to normalize the strokes and placing the start point in the exact position
        const offset_x = Number(stroke.style.left.replace("px", "")) || 0;
        const offset_y = Number(stroke.style.top.replace("px", "")) || 0;

        const path: SVGPathElement = stroke.children[0] as SVGPathElement;
        const directives = path.getAttribute("d")?.split(" ");

        if (directives) {
            const pathStroke = path.getAttribute("stroke");

            // OneNote stroke opacity, defaults to 1 (max) if not found
            const opacity = Number(path.getAttribute("opacity")) || 1;

            // OneNote stroke colors, defaults to black if not found
            const colors = (pathStroke) ? COLOR_REGEXP.exec(pathStroke) : ["0,0,0", "0", "0", "0"];


            const color: RGB = (colors) ? {
                r: round3(Number(colors[1]) / 255),
                g: round3(Number(colors[2]) / 255),
                b: round3(Number(colors[3]) / 255),
                a: round3(opacity)
            } : base_color;

            // OneNote stroke width, rounded to 2 decimal positions, defaults to 1 if not found
            const width = Math.round(Number(path.getAttribute("stroke-width")) * stroke_scale * 100) / 100;
            let stroke_component: StrokeComponent = {
                value: {
                    bitmapimage: undefined,
                    textstroke: undefined,
                    brushstroke: {
                        path: {
                            start: {
                                pos: [0, 0],
                                pressure: 1
                            },
                            segments: [{
                                lineto: {
                                    end: {
                                        pos: [0, 0],
                                        pressure: 1
                                    }
                                }
                            }]
                        },
                        style: {
                            smooth: {
                                stroke_width: width,
                                stroke_color: color,
                                fill_color: color,
                                pressure_curve: "linear",
                                line_style: "solid",
                                line_cap: "straight"
                            }
                        }
                    }
                },
                version: 1,
            }

            for (let i = 0; i < directives.length; i++) {
                const directive = directives[i];
                // RNote strokes representation is unknown, we assume it doesn't permit empty spaces/skips, so we need
                // to split the SVG Path into multiple strokes in case of movements
                if (directive === "M") {
                    const x = Number(directives[i + 1]);
                    const y = Number(directives[i + 2]);

                    stroke_component = {
                        value: {
                            bitmapimage: undefined,
                            textstroke: undefined,
                            brushstroke: {
                                path: {
                                    start: {
                                        pos: [round3(x - view_box.x) * scale_x + offset_x, round3(y - view_box.y) * scale_y + offset_y],
                                        pressure: 1
                                    },
                                    segments: [{
                                        lineto: {
                                            end: {
                                                pos: [round3(x - view_box.x) * scale_x + offset_x, round3(y - view_box.y) * scale_y + offset_y],
                                                pressure: 1
                                            }
                                        }
                                    }]
                                },
                                style: {
                                    smooth: {
                                        stroke_width: width,
                                        stroke_color: color,
                                        fill_color: color,
                                        pressure_curve: "linear",
                                        line_style: "solid",
                                        line_cap: "straight"
                                    }
                                }
                            }
                        },
                        version: 1,
                    }

                    // If the opacity is < 1, we suppose that the stroke is made with highlighter since there's seems to be
                    // no other notation to distinguish a highlighter by a pen
                    if (opacity < 1) { // TODO: implement Highlighter
                        file.new_chrono("highlighter");
                    }else{
                        file.new_chrono(0);
                    }


                    // stroke_component.version = chrono.value!.t;
                    converted_strokes.push(stroke_component);
                    i += 2;
                } else if (directive == "l") {
                    let x = parseInt(directives[i + 1]);
                    let y = parseInt(directives[i + 2]);
                    i += 3;

                    // Continue to scan the line value two number at times, if a number is invalid it resets the
                    // index position and continue with normal scan looking for other directives
                    while (!isNaN(x) && !isNaN(y)) {
                        const length = stroke_component.value!.brushstroke!.path.segments.length;
                        const old_coords = stroke_component.value!.brushstroke!.path.segments[length - 1].lineto.end.pos;
                        const next_x = old_coords[0] + (x * scale_x);
                        const next_y = old_coords[1] + (y * scale_y);

                        // Inelegant solution to export strokes max_width and max_height by side effect without
                        // scanning multiple times all the strokes
                        page_size.width = Math.max(page_size.width, next_x);
                        page_size.height = Math.max(page_size.height, next_y);
                        stroke_component.value!.brushstroke!.path.segments.push({
                            lineto: {
                                end: {
                                    pos: [round3(next_x), round3(next_y)],
                                    pressure: 1.0
                                }
                            }

                        })
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

        } else {
            LOG.warn(`Invalid stroke detected: missing 'd' in ${path}`);
        }
    }
    return converted_strokes;
}