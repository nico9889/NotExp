import {Color} from "./colors";
import {COLOR_REGEXP} from "../../adapters/converter";
import {OneNote} from "../onenote";
import {round3} from "../../rnote/utils";


// Original idea: https://www.youtube.com/watch?v=kuGA8a_W4s4
function* splitWrappedText(text: HTMLElement) {
    const range = document.createRange();
    let lastIndex = 0;
    const textContent = text.textContent || "";
    for (let i = 0; i < textContent.length; i++) {
        range.setStart(text, lastIndex);
        range.setEnd(text, i + 1);
        if (range.getClientRects().length > 1) {
            yield textContent.substring(lastIndex, i);
            lastIndex = i;
        }
    }
    if (lastIndex != textContent.length) {
        yield textContent.substring(lastIndex, textContent.length);
    }
}

export interface Chunk {
    readonly index: number,
    readonly line: string,
    readonly x: number,
    readonly y: number,
    readonly width: number
    readonly height: number
}

export class Text {
    readonly document: OneNote;
    readonly text: HTMLSpanElement;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly color: Color;
    readonly fontSize: number;
    readonly #fontFamily: string;

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
        // TODO: add the possibility to override export font
        this.#fontFamily = getComputedStyle(text).getPropertyValue("font-family");


        this.fontSize = ((Number(window.getComputedStyle(text).getPropertyValue("font-size").replace("px", "")) ?? 12));
        const offsets = this.document.offsets;
        const zoom = this.document.zoom;
        const box = this.text.getBoundingClientRect();
        this.x = round3((box.x - offsets.x) / zoom);
        this.y = round3((box.y - offsets.y) / zoom);
        this.width = round3(box.width);
        this.height = round3(box.height);
    }

    get font() {
        return (this.#fontFamily.split(", ")[1] ?? "Calibri").trim();
    }

    get fontFamily(): string | undefined {
        return this.#fontFamily.split(", ")[2].trim();
    }

    // FIXME: the code here is an horror show...
    // OneNote splits a text paragraph in multiple chunks (<span class="TextRun">).
    // Almost every chunk contains a text with different properties
    // (text color, bg color, font, size, bold, italic, ...).
    // Every chunk is split in other chunks at its times, based on the text decoration,
    // like spelling mistake underline (<span class="SpellingError">).
    // If the text doesn't contain decorations, a single sub-chunk (<span class="NormalTextRun">) is then created.
    // Every sub-chunk is then wrapped if it overflows the text box.
    // This kind of structure is not supported by almost all the exported formats, as every program handles the text
    // boxes differently.
    // The code below tries to create more "standard" chunks, grouping all the sub-chunks
    // (primarily NormalTextRun and SpellingError), and creating new chunks where the text wraps.
    // For example, if a OneNote document contains the following phrase "The quick brwn fox jumps over the lzy dog",
    // but the text box is too small, so it's rendered like
    // "[The quick ][brwn ][fox jumps
    // over the ][lzy ][dog]"
    // Where "[]" represents the <span> created by OneNote, the function should return
    // ["The quick brwn fox jumps", "over the lzy dog"].
    // This is achieved by splitting the chunks emulating the text wrap using Range (see splitWrappedText),
    // and then matching the splitted chunks with the corresponding text boxes.
    * chunks(): Generator<Chunk> {
        if (!this.text.children) return;
        const offsets = this.document.offsets;
        const zoom = this.document.zoom;

        let line_buffer = "";
        let total_width = 0;
        let last_boundaries: DOMRectList | undefined = undefined;
        let first_x: number | undefined = undefined;
        for (const child of this.text.children) {
            // const htmlChild = child as HTMLElement;
            const nodeTextChild = child.firstChild as (HTMLElement | null);
            if (nodeTextChild) {
                const textBoundaries = child.getClientRects();
                last_boundaries = textBoundaries;
                const rect = textBoundaries[0];
                const x = round3((rect.x - offsets.x) / zoom);
                const y = round3((rect.y - offsets.y) / zoom);
                const width = round3(rect.width / zoom);
                const height = round3(rect.height);
                total_width += width;
                first_x = first_x ?? x;
                if (textBoundaries.length > 1) {
                    const lines = splitWrappedText(nodeTextChild);

                    line_buffer += lines.next().value;

                    const rect = textBoundaries[0];
                    yield {
                        index: 0,
                        line: line_buffer,
                        x: first_x,
                        y,
                        width: total_width,
                        height
                    };

                    // This function is not able to handle text lines that have been wrapped more than 2 times, but
                    // this should be a very edge case.
                    const next = lines.next().value;
                    if (next) {
                        const next_rect = textBoundaries[1];
                        yield {
                            index: 0,
                            line: next,
                            x: round3((next_rect.x - offsets.x) / zoom),
                            y: round3((next_rect.y - offsets.y) / zoom),
                            width: round3(next_rect.width / zoom),
                            height: round3(rect.height)
                        };
                    }
                    line_buffer = "";
                    first_x = undefined;
                } else {
                    line_buffer += nodeTextChild.textContent;
                }
            }
        }
        if (last_boundaries && line_buffer) {
            const rect = last_boundaries[0];
            const x = round3((rect.x - offsets.x) / zoom);
            const y = round3((rect.y - offsets.y) / zoom);

            const width = round3(rect.width / zoom);
            const height = round3(rect.height);
            yield {index: 0, line: line_buffer, x: first_x  ?? x, y, width: total_width ?? width, height}
        }
    }

}