import {MathQuality} from "../../messages/convert";
import {TexImage} from "../../xournalpp/teximage";
import {MathMLToLaTeX} from "mathml-to-latex";
import {LOG, Offsets, PageSize} from "../converter";
import {IMAGE_BASE64_REGEXP} from "./images";
import {mathjax} from 'mathjax-full/mjs/mathjax.js'
import {MathML} from 'mathjax-full/mjs/input/mathml.js'
import {SVG} from 'mathjax-full/mjs/output/svg.js'
import {browserAdaptor} from 'mathjax-full/mjs/adaptors/browserAdaptor.js'
import {RegisterHTMLHandler} from 'mathjax-full/mjs/handlers/html.js'

const UNSAFE_XML_SPACE = new RegExp("&nbsp;", "g");

function sanitize_latex(latex: string): string{
    // In theory XML symbols should be replaced as well, but Xournal++ seems to parse XML
    // in a weird way that supports illegal symbols in strings and do not support escaped characters
    return decodeURI(latex.replace(UNSAFE_XML_SPACE, " "));
}

const ADAPTOR = browserAdaptor();
RegisterHTMLHandler(ADAPTOR);

export async function convertMathMLBlocks(offsets: Offsets, math_dark_mode: boolean, math_quality: MathQuality, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting MathML blocks");
    const converted_blocks: TexImage[] = [] // Empty output array

    // Getting math blocks from OneNote page
    const math_containers = document.getElementsByClassName("MathSpan") as HTMLCollectionOf<HTMLSpanElement>;
    LOG.info(`Found ${math_containers.length} MathML block(s)`);

    // Preparing canvas for image conversion
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    const mathDocument = mathjax.document('', {
        InputJax: new MathML(),
        OutputJax: new SVG({
            mathmlSpacing: true,
            fontCache: 'local',
            internalSpeechTitles: false
        }),
    });
    for (const container of math_containers) {
        const fontSize = Number(window.getComputedStyle(container).fontSize.replace("px", ""));
        const math_element = container.children[0] as MathMLElement;
        const boundingRect = math_element.getBoundingClientRect();
        const latex = sanitize_latex(MathMLToLaTeX.convert(math_element.outerHTML));

        try {
            const node = mathDocument.convert(container.innerHTML);

            const blob = new Blob([ADAPTOR.innerHTML(node)], {type: "image/svg+xml;charset=utf-8"});

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
            canvas.width = img.width * math_quality * zoom_level;
            canvas.height = img.height * math_quality * zoom_level;

            // Drawing the image into a Canvas
            if(math_dark_mode) {
                ctx.filter = 'invert(100%)';
            }
            ctx.drawImage(img, 0, 0, boundingRect.width * math_quality, boundingRect.height * math_quality);

            // Exporting the Canvas as an encoded Base64 PNG string
            const uri = canvas.toDataURL("image/png", 1);

            // Clearing the Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Creating a new TexImage with dimensions and data, this object handles
            // the XML conversion
            const tex_image = new TexImage(
                latex,
                uri.replace(IMAGE_BASE64_REGEXP, ""),
                (boundingRect.x - offsets.x) / zoom_level,
                (boundingRect.y - offsets.y - (fontSize / 2)) / zoom_level,
                img.width,
                img.height,
            )

            page_size.width = Math.max(page_size.width, (boundingRect.x + img.width)  / zoom_level);
            page_size.height = Math.max(page_size.height, (boundingRect.y + img.height)  / zoom_level);

            // Pushing the TexImage into the output array
            converted_blocks.push(tex_image);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("O2X: Error converting to SVG", e);
        }


    }

    return converted_blocks;
}