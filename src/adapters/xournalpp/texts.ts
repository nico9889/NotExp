import {COLOR_REGEXP, LOG} from "../converter";
import {Offsets, PageSize} from "./xournalpp-adapter";
import {Color, RGBAColor} from "../../xournalpp/utils";
import {Layer} from "../../xournalpp/page";


// Original idea: https://www.youtube.com/watch?v=kuGA8a_W4s4
function splitWrappedText(text: HTMLElement): string[] {
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


function processParagraph(layer: Layer, paragraph: HTMLParagraphElement,
                          offsets: Offsets, dark_mode: boolean, page_size: PageSize, zoom_level: number) {
    const texts = paragraph.getElementsByClassName("TextRun") as HTMLCollectionOf<HTMLSpanElement>;

    for (const text of texts) {
        if (text.children[0]?.innerHTML) {
            const textColor = window.getComputedStyle(text).getPropertyValue("color");

            let [_, r, g, b] = ["", "0", "0", "0"];
            try {
                [_, r, g, b] = textColor.match(COLOR_REGEXP) || ["", "0", "0", "0"];
            } catch (e) {
                console.debug(`NEX: error while matching color from ${textColor}`, e);
            }

            let color;

            if (dark_mode && r === "0" && g === "0" && b === "0") {
                color = RGBAColor.fromColor(Color.White);
            } else {
                const rgba = textColor.match(/.{1,2}/g);
                if (rgba)
                    color = new RGBAColor(Number(r), Number(g), Number(b));
            }

            const fontFamily = getComputedStyle(text).getPropertyValue("font-family");

            // TODO: add the possibility to override export font
            const font = fontFamily.split(",")[1] ?? "Calibri";

            const fontSize = ((Number(window.getComputedStyle(text).getPropertyValue("font-size").replace("px", "")) ?? 12));

            for (let child of text.children) {
                if (child.classList.contains("SpellingError") || child.classList.contains("NormalTextRun")) {
                    // const htmlChild = child as HTMLElement;
                    const nodeTextChild = child.firstChild as HTMLElement;
                    const lines = splitWrappedText(nodeTextChild);

                    const textBoundaries = child.getClientRects();
                    for (let index = 0; index < lines.length; index++) {
                        const line = lines[index];
                        const rect = textBoundaries[index];

                        const converted_text = layer.addText();
                        converted_text.size = fontSize;
                        converted_text.data = line;
                        if (color)
                            converted_text.color = color;

                        // The quote replacement is necessary only in Chrome
                        converted_text.font = font.replace(/"/g, "");
                        const x = (rect.x - offsets.x) / zoom_level;
                        const y = (rect.y - offsets.y) / zoom_level;
                        converted_text.x = x;
                        converted_text.y = y;

                        const text_width = rect.width / zoom_level;
                        // Inelegant solution to export texts max_width and max_height by side effect without
                        // scanning multiple times all the texts
                        page_size.width = Math.max(page_size.width, x + text_width);
                        page_size.height = Math.max(page_size.height, y + (rect.height / zoom_level));
                    }

                }
            }
        }
    }
}


export function convertTexts(panel: HTMLDivElement, layer: Layer, offsets: Offsets, dark_mode: boolean, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting texts");

    const paragraphs = panel.getElementsByClassName("Paragraph") as HTMLCollectionOf<HTMLParagraphElement>;

    for (const paragraph of paragraphs) {
        try {
            processParagraph(layer, paragraph, offsets, dark_mode, page_size, zoom_level);
        } catch (e) {
            LOG.error(`An error occurred while exporting a text paragraph: ${e}`)
        }
    }
}