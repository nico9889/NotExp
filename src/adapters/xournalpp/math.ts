import {MathQuality} from "../../messages/convert";
import {TexImage} from "../../xournalpp/teximage";
import {MathMLToLaTeX} from "mathml-to-latex";
import {LOG} from "../converter";
import {Offsets, PageSize} from "./xournalpp-adapter";
import {IMAGE_BASE64_REGEXP} from "./images";
import {mathjax} from '@mathjax/src/mjs/mathjax.js';
import {browserAdaptor} from "@mathjax/src/mjs/adaptors/browserAdaptor.js";
import {RegisterHTMLHandler} from "@mathjax/src/mjs/handlers/html.js";
import {MathML} from "@mathjax/src/mjs/input/mathml.js";
import {SVG} from "@mathjax/src/mjs/output/svg.js";
import {Layer} from "../../xournalpp/page";

const UNSAFE_XML_SPACE = new RegExp("&nbsp;", "g");

function sanitize_latex(latex: string): string{
    // In theory XML symbols should be replaced as well, but Xournal++ seems to parse XML
    // in a weird way that supports illegal symbols in strings and do not support escaped characters
    return decodeURI(latex.replace(UNSAFE_XML_SPACE, " "));
}

const adaptor = browserAdaptor();
RegisterHTMLHandler(adaptor);

export async function convertMathMLBlocks(panel: HTMLDivElement, layer: Layer, offsets: Offsets, math_dark_mode: boolean, math_quality: MathQuality, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting MathML blocks");
    const converted_blocks: TexImage[] = [] // Empty output array

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
        const latex = sanitize_latex(MathMLToLaTeX.convert(math_element.outerHTML));

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
            canvas.width = img.width * math_quality ;
            canvas.height = img.height * math_quality ;

            // Drawing the image into a Canvas
            if(math_dark_mode) {
                ctx.filter = 'invert(100%)';
            }
            ctx.drawImage(img, 0, 0, boundingRect.width * math_quality / zoom_level, boundingRect.height * math_quality / zoom_level);

            // Exporting the Canvas as an encoded Base64 PNG string
            const uri = canvas.toDataURL("image/png", 1);

            // Clearing the Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Creating a new TexImage with dimensions and data, this object handles
            // the XML conversion
            const tex_image = layer.addMath(
                latex,
                uri.replace(IMAGE_BASE64_REGEXP, ""),
                (boundingRect.x - offsets.x) / zoom_level,
                (boundingRect.y - offsets.y) / zoom_level - (fontSize / 2),
                img.width,
                img.height,
            )

            page_size.width = Math.max(page_size.width, tex_image.right);
            page_size.height = Math.max(page_size.height, tex_image.bottom);

            // Pushing the TexImage into the output array
            converted_blocks.push(tex_image);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("NEX: Error converting to SVG", e);
        }


    }

    return converted_blocks;
}