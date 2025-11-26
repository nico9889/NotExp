import {MathQuality} from "../../messages/convert";
import {LOG} from "../converter";
import {File} from "../../rnote/file";
import {StrokeComponent} from "../../rnote/stroke";
import {Offsets, PageSize} from "./rnote-adapter";
import {IMAGE_BASE64_REGEXP, pack} from "./images";
import {mathjax} from '@mathjax/src/mjs/mathjax.js';
import {browserAdaptor} from "@mathjax/src/mjs/adaptors/browserAdaptor.js";
import {RegisterHTMLHandler} from "@mathjax/src/mjs/handlers/html.js";
import {MathML} from "@mathjax/src/mjs/input/mathml.js";
import {SVG} from "@mathjax/src/mjs/output/svg.js";
import {round3} from "../../rnote/utils";
import {Rectangle} from "../../rnote/image";

const adaptor = browserAdaptor();
RegisterHTMLHandler(adaptor);

// FIXME: RNote currently doesn't support math, so we export every math block just as an image, so the user
//   can choice between:
//   * having the exported document full of empty spaces;
//   * having non-modifiable math blocks instead, which may be better than nothing.
export async function* convertMathMLBlocks(panel: HTMLDivElement, file: File, offsets: Offsets, math_dark_mode: boolean, math_quality: MathQuality, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting MathML blocks");

    // Getting math blocks from OneNote page
    const math_containers = panel.getElementsByClassName("MathSpan") as HTMLCollectionOf<HTMLSpanElement>;
    LOG.info(`Found ${math_containers.length} MathML block(s)`);

    // Preparing canvas for image conversion
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    const mathDocument = mathjax.document('', {
        InputJax: new MathML(),
        OutputJax: new SVG({
            mathmlSpacing: true,
            fontCache: 'local'
        }),
    });
    for (const container of math_containers) {
        const fontSize = Number(window.getComputedStyle(container).fontSize.replace("px", ""));
        const math_element = container.children[0] as MathMLElement;
        const boundingRect = math_element.getBoundingClientRect();
        // const latex = sanitize_latex(MathMLToLaTeX.convert(math_element.outerHTML));

        try {
            const node = mathDocument.convert(container.innerHTML);

            const blob = new Blob([adaptor.innerHTML(node)], {type: "image/svg+xml;charset=utf-8"});

            const url = URL.createObjectURL(blob);

            // Converting to SVG to Base64 to load it as an Image
            const img = new window.Image();
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    resolve(img)
                };
                img.onerror = (e) => {
                    reject(e)
                }
                img.src = url;
            });
            // Setting output image resolution scale based on user preferences (x1, x2, x4)
            canvas.width = img.width * math_quality;
            canvas.height = img.height * math_quality;

            // Drawing the image into a Canvas
            if (math_dark_mode) {
                ctx.filter = 'invert(100%)';
            }
            ctx.drawImage(img, 0, 0, boundingRect.width * math_quality / zoom_level, boundingRect.height * math_quality / zoom_level);

            // Exporting the Canvas as an encoded Base64 PNG string
            const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = btoa(pack(raw.data)).replace(IMAGE_BASE64_REGEXP, "");

            const real_x = (boundingRect.x - offsets.x) / zoom_level;
            const real_y = (boundingRect.y - offsets.y) / zoom_level - (fontSize / 2);

            const width = round3(img.width);
            const height = round3(img.height);

            const half_width = round3(width / 2);
            const half_height = round3(height / 2);

            const size: Rectangle = {
                cuboid: {
                    half_extents: [half_width, half_height],
                },
                transform: {
                    affine: [
                        1, 0, 0,
                        0, 1, 0,
                        half_width, half_height, 1
                    ]
                }
            }

            const position: Rectangle = {
                cuboid: {
                    half_extents: [half_width, half_height],
                },
                transform: {
                    affine: [
                        1, 0, 0,
                        0, 1, 0,
                        real_x + half_width, real_y + half_height, 1
                    ]
                }
            }
            file.new_chrono("image")
            yield JSON.stringify({
                value: {
                    brushstroke: undefined,
                    textstroke: undefined,
                    bitmapimage: {
                        image: {
                            data: data,
                            rectangle: size,
                            pixel_width: Math.round(canvas.width),
                            pixel_height: Math.round(canvas.height),
                            memory_format: "R8g8b8a8Premultiplied"
                        },
                        rectangle: position,
                    }
                }, version: 1

            })

            page_size.width = Math.max(page_size.width, real_x + width);
            page_size.height = Math.max(page_size.height, real_y + height);

            // Clearing the Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Pushing the TexImage into the output array
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("NEX: Error converting to SVG", e);
        }
    }
}