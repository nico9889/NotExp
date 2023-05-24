import {Text} from "../xournalpp/text";
import {Image} from "../xournalpp/image";
import {Stroke, Tool} from "../xournalpp/stroke";
import {Layer, Page} from "../xournalpp/page";
import {Document} from "../xournalpp/document";
import {Color, RGBAColor} from "../xournalpp/utils";
import {gzip} from "pako";

export class Converter {
    // Stroke need to be scaled to this size
    scaleX: number = 0.04;
    scaleY: number = 0.04;
    strokeScale: number = 0.04;

    // Stroke color need to be parsed
    color_regexp: RegExp = new RegExp("rgb\\(([0-9]{1,3}),([0-9]{1,3}),([0-9]{1,3})\\)");

    // This is not really necessary
    static instance: Converter;

    // Exported file
    pom: HTMLAnchorElement | undefined;

    private constructor() {
    }

    static build(): Converter {
        if (!this.instance) {
            this.instance = new Converter();
        }
        return this.instance;
    }

    convertStrokes(additional?: { max_width: number, max_height: number }): Stroke[] {
        const converted_strokes: Stroke[] = [];
        const strokes = document.getElementsByClassName("InkStrokeOuterElement") as HTMLCollectionOf<SVGElement>;
        console.debug("O2X: Converting strokes");
        for (const stroke of strokes) {
            const strokeBoundaries = stroke.getBoundingClientRect();

            // Inelegant solution to export strokes max_width and max_height by side effect without
            // scanning multiple times all the strokes
            if (additional) {
                additional.max_width = Math.max(additional.max_width, strokeBoundaries.x + strokeBoundaries.width);
                additional.max_height = Math.max(additional.max_height, strokeBoundaries.y + strokeBoundaries.height);
            }

            // SVG ViewBox, shifts the stroke into a specific direction
            const view_box_string = stroke.getAttribute("viewBox");
            const view_box_values = view_box_string?.split(" ");
            const view_box = {
                x: (view_box_values) ? Number(view_box_values[0]) || 0 : 0,
                y: (view_box_values) ? Number(view_box_values[1]) || 0 : 0,
                width: (view_box_values) ? Number(view_box_values[2]) || 0 : 0,
                height: (view_box_values) ? Number(view_box_values[3]) || 0 : 0,
            }

            // Every stroke for some reason is shifted three times: one external, by SVG style and viewbox property,
            // and one internal, by a large movement in the path ("M n n") in the opposite direction
            // We need this offset to normalize the strokes and placing the start point in the exact position
            const offset_x = Number(stroke.style.left.replace("px", "")) || 0;
            const offset_y = Number(stroke.style.top.replace("px", "")) || 0;

            const path: SVGPathElement = stroke.children[0] as SVGPathElement;
            const directives = path.getAttribute("d")?.split(" ");
            if (directives) {
                let stroke = new Stroke();
                const pathStroke = path.getAttribute("stroke");

                // OneNote stroke opacity, defaults to 1 (max) if not found
                const opacity = Number(path.getAttribute("opacity")) || 1;

                // OneNote stroke colors, defaults to black if not found
                const colors = (pathStroke) ? this.color_regexp.exec(pathStroke) : ["0,0,0", "0", "0", "0"];
                const color = (colors) ? new RGBAColor(Number(colors[1]), Number(colors[2]), Number(colors[3]), Math.round(opacity * 255)) : Color.Black;

                // OneNote stroke width, rounded to 2 decimal positions, defaults to 1 if not found
                const width = Math.round(Number(path.getAttribute("stroke-width")) * this.strokeScale * 100) / 100 ?? 1;


                for (let i = 0; i < directives.length; i++) {
                    const directive = directives[i];
                    // Xournal strokes representation doesn't permit empty spaces/skips, so we need to split the SVG Path into
                    // multiple strokes in case of movements
                    if (directive === "M") {
                        stroke = new Stroke();
                        stroke.width = width;
                        stroke.color = color;

                        // If the opacity is < 1, we suppose that the stroke is made with highlighter since there's seems to be
                        // no other notation to distinguish a highlighter by a pen
                        if (opacity < 1) {
                            stroke.tool = Tool.Highlighter;
                        }
                        converted_strokes.push(stroke);
                        const x = Number(directives[i + 1]);
                        const y = Number(directives[i + 2]);


                        stroke.coords.push([(x - view_box.x) * this.scaleX + offset_x, (y - view_box.y) * this.scaleY + offset_y]);
                        i += 2;
                    } else if (directive == "l") {
                        let x = parseInt(directives[i + 1]);
                        let y = parseInt(directives[i + 2]);
                        i += 3;

                        // Continue to scan the line value two number at times, if a number is invalid it resets the
                        // index position and continue with normal scan looking for other directives
                        while (!isNaN(x) && !isNaN(y)) {
                            const old_coords = stroke.coords[stroke.coords.length - 1];
                            const next_x = old_coords[0] + (x * this.scaleX);
                            const next_y = old_coords[1] + (y * this.scaleY);
                            stroke.coords.push([next_x, next_y]);
                            x = parseInt(directives[i]);
                            y = parseInt(directives[i + 1]);
                            i += 2;
                        }
                        i -= 3;
                    } else {
                        // Skips unmanaged directives, warning the user that this value has been unused
                        // so if it was useful it can be reported
                        console.debug(`O2X: Skipped ${directives[i]}`)
                    }
                }
            } else {
                console.warn(`O2X: Invalid stroke: 'd' not found in ${path}`);
            }
        }
        return converted_strokes;
    }

    #sanitize(text: string): string {
        return text.replace(/[^a-zA-Z0-9 ]+/, '') || "OneNote";
    }

    convertTexts(offset_x: number, offset_y: number, additional?: { max_width: number, max_height: number }): Text[] {
        const texts = document.getElementsByClassName("TextRun") as HTMLCollectionOf<HTMLSpanElement>;
        const converted_texts: Text[] = [];
        console.debug("O2X: Converting texts");
        for (const text of texts) {
            if (text.children[0].innerHTML) {
                const textBoundaries = text.getBoundingClientRect();

                const converted_text = new Text();

                converted_text.data = text.children[0].innerHTML;
                converted_text.size = Number(text.style.fontSize.replace("pt", "")) ?? 12;
                // converted_text.color; TODO: not handled
                converted_text.x = textBoundaries.x - offset_x;
                converted_text.y = textBoundaries.y - offset_y;
                converted_text.width = textBoundaries.width;

                converted_texts.push(converted_text);

                // Inelegant solution to export texts max_width and max_height by side effect without
                // scanning multiple times all the texts
                if (additional) {
                    additional.max_width = Math.max(additional.max_width, converted_text.x + textBoundaries.width);
                    additional.max_height = Math.max(additional.max_height, converted_text.y + textBoundaries.height);
                }

            }
        }
        return converted_texts;
    }

    convertImages(offset_x: number, offset_y: number, additional?: { max_width: number, max_height: number }): Image[] {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const converted_images: Image[] = [];
        const image_containers = document.getElementsByClassName("WACImageContainer") as HTMLCollectionOf<HTMLDivElement>;
        console.debug("O2X: Converting images");
        for (const container of image_containers) {
            // OneNote uses (at least?) two type of positioning method for the images:
            // Absolute: coordinates are inside the WACImageContainer style;
            // Relative: the image is shifted by an offset from the main WACViewPanel.
            // We try first with the absolute position, if it's not found we try to calculate the relative position,
            // converting it to an (hopefully correct) absolute one
            const x: number = Number(container.style.left.replace("px", "")) || 0;
            const y: number = Number(container.style.top.replace("px", "")) || 0;
            const image: HTMLImageElement = (container.getElementsByClassName("WACImage") as HTMLCollectionOf<HTMLImageElement>)[0];
            const image_boundaries = image.getBoundingClientRect();

            /* Converting non-PNG image to PNG using Canvas */
            let src = image.src;
            const isPng = new RegExp("data:image/png;base64,.*");
            if(ctx && !isPng.test(src)){
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0,0, image.width, image.height);
                src = canvas.toDataURL("image/png", 0.8);
                ctx.clearRect(0,0,canvas.width,canvas.height);
            }

            const data = src.replace(new RegExp("data:image/.*;base64,"), "");

            const converted_image = new Image(data, x || (image_boundaries.x - offset_x), y || (image_boundaries.y - offset_y), image.width, image.height);
            converted_images.push(converted_image);

            // Inelegant solution to export images max_width and max_height by side effect without
            // scanning multiple times all the images
            if (additional) {
                additional.max_width = Math.max(additional.max_width, converted_image.right);
                additional.max_height = Math.max(additional.max_height, image_boundaries.bottom);
            }

        }
        return converted_images
    }

    convert(strokes: boolean, images: boolean, texts: boolean, separateLayers: boolean) {
        // Page dimensions
        const dimension = {
            max_width: 0,
            max_height: 0
        }

        console.debug("O2X: Converting...");
        const panel = document.getElementById("WACViewPanel");
        if (!panel) {
            console.error("Conversion failed: cannot find WACViewPanel");
            return;
        }
        const panel_boundaries = panel.getBoundingClientRect();

        const converted_texts: Text[] = (texts) ? this.convertTexts(panel_boundaries.x, panel_boundaries.y, dimension) : [];
        const converted_images: Image[] = (images)? this.convertImages(panel_boundaries.x, panel_boundaries.y, dimension) : [];
        const converted_strokes: Stroke[] = (strokes) ? this.convertStrokes(dimension) : [];

        console.debug("O2X: Assembling document");
        const exportDoc = new Document(document.title);
        const page = new Page();

        page.height = dimension.max_height + 5;
        page.width = dimension.max_width + 5;

        if(separateLayers){
            // To simplify the edit of the exported document different layers are used for different elements
            const images_layer = new Layer();
            images_layer.images = converted_images;
            const texts_layer = new Layer();
            texts_layer.texts = converted_texts;
            const strokes_layer = new Layer();
            strokes_layer.strokes = converted_strokes;
            page.layers.push(images_layer);
            page.layers.push(texts_layer);
            page.layers.push(strokes_layer);
        }else{
            const layer = new Layer();
            layer.images = converted_images;
            layer.texts = converted_texts;
            layer.strokes = converted_strokes;
            page.layers.push(layer);
        }

        exportDoc.pages.push(page);

        console.debug("O2X: Preparing document to exportation");
        // Xournal++ file format is a GZIP archive with an XML file inside. We need to GZIP the XML before
        // exporting it
        const archive = gzip(exportDoc.toXml());

        // The GZIP file is associated to a phantom Anchor element to be exported
        const blob = new Blob([archive], {type: "application;gzip"});
        const url = URL.createObjectURL(blob);
        this.pom = document.createElement("a");
        this.pom.setAttribute('href', url);
    }

    download(filename: string) {
        let title = filename;
        if (!title) {
            const titles = document.getElementsByClassName("Title GrowUnderline");
            if (titles) {
                const spans = titles[0].getElementsByTagName("span");
                const titleSpan = spans[0];
                title = titleSpan.textContent ?? "OneNote";
            }
        }

        if (!this.pom) {
            console.error("No file has been converted. Cannot export");
            return;
        }

        this.pom.setAttribute('download', `${this.#sanitize(title)}.xopp`);
        this.pom?.click();
    }
}
