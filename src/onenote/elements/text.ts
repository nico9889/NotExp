import {Color} from "./colors";
import {COLOR_REGEXP} from "../../adapters/converter";
import {OneNote} from "../onenote";
import {round3} from "../../rnote/utils";


// Original idea: https://www.youtube.com/watch?v=kuGA8a_W4s4
function splitWrappedText(text: HTMLElement | null): string[] {
    if(!text){
        return [];
    }
    const range = document.createRange();
    let lastIndex = 0;
    const lines: string[] = [];
    const textContent = text.textContent || "";
    for (let i = 0; i < textContent.length; i++) {
        range.setStart(text, lastIndex);
        range.setEnd(text, i + 1);
        if (range.getClientRects().length > 1) {
            lines.push(textContent.substring(lastIndex, i));
            lastIndex = i;
        }
    }
    if (lastIndex != textContent.length) {
        lines.push(textContent.substring(lastIndex, textContent.length));
    }
    return lines;
}

export interface Chunk {
    index: number,
    line: string,
    x: number,
    y: number,
    width: number
    height: number
}

export class Text {
    readonly document: OneNote;
    readonly text: HTMLSpanElement;
    readonly color: Color;
    readonly font: string;
    readonly fontSize: number;

    constructor(document: OneNote, text: HTMLSpanElement) {
        this.document = document;
        this.text = text;
        const color_property = window.getComputedStyle(text).getPropertyValue("color");
        let [_, r, g, b] = ["", "0", "0", "0"];
        try {
            [_, r, g, b] = color_property.match(COLOR_REGEXP) || ["", "0", "0", "0"];
        } catch (e) {
            console.debug(`NEX: error while matching color from ${color_property}`, e);
        }
        this.color = new Color(Number(r), Number(g), Number(b), 1, document.options.texts_dark_mode);
        const fontFamily = getComputedStyle(text).getPropertyValue("font-family");

        // TODO: add the possibility to override export font
        this.font = fontFamily.split(",")[1] ?? "Calibri";

        this.fontSize = ((Number(window.getComputedStyle(text).getPropertyValue("font-size").replace("px", "")) ?? 12));
    }

    * chunks(): Generator<Chunk> {
        if (!this.text.children) return;
        for (let child of this.text.children) {
            // const htmlChild = child as HTMLElement;
            const nodeTextChild = child.firstChild as (HTMLElement | null);
            const lines = splitWrappedText(nodeTextChild);

            const offsets = this.document.offsets;
            const zoom = this.document.zoom;

            const textBoundaries = child.getClientRects();
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                const rect = textBoundaries[index];

                const x = round3((rect.x - offsets.x) / zoom);
                const y = round3((rect.y - offsets.y) / zoom);

                const width = round3(rect.width / zoom);
                yield {index, line, x, y, width, height: round3(rect.height)};
            }
        }
    }
}