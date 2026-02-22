import {browserAdaptor} from "@mathjax/src/mjs/adaptors/browserAdaptor.js";
import {RegisterHTMLHandler} from "@mathjax/src/mjs/handlers/html.js";
import {mathjax} from '@mathjax/src/mjs/mathjax.js';
import {MathML} from "@mathjax/src/mjs/input/mathml.js";
import {SVG} from "@mathjax/src/mjs/output/svg.js";
import {MathDocument} from "@mathjax/src/mjs/core/MathDocument";

import {OneNote} from "../onenote";
import {ConvertibleImage} from "./image";
import {MathMLToLaTeX} from "mathml-to-latex";

const adaptor = browserAdaptor();
RegisterHTMLHandler(adaptor);

export class Math extends ConvertibleImage {
    readonly document: OneNote;
    readonly math: HTMLSpanElement;
    static mathDocument: MathDocument<any, any,any> | undefined = undefined;

    constructor(document: OneNote, math: HTMLSpanElement) {
        super(Math.mathToImage(math), document.options.math_dark_mode, document.options.math_quality );
        this.document = document;
        this.math = math;
    }

    static getMathDocument(){
        if(!Math.mathDocument){
            Math.mathDocument = mathjax.document('', {
                InputJax: new MathML(),
                OutputJax: new SVG({
                    mathmlSpacing: true,
                    fontCache: 'local'
                }),
            });
        }
        return Math.mathDocument;
    }

    static async mathToImage(math: HTMLSpanElement){
        const mathDocument = Math.getMathDocument();
        const node = mathDocument.convert(math.innerHTML);

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
        return img;
    }

    toLatex(){
        return MathMLToLaTeX.convert(this.math.outerHTML);
    }
}