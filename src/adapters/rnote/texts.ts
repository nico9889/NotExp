import {COLOR_REGEXP, LOG} from "../converter";
import {File} from "../../rnote/file";
import {RGB, Colors, round3} from "../../rnote/utils";
import {Offsets, PageSize} from "./rnote-adapter";
import {TextStroke} from "../../rnote/text";
import {StrokeComponent} from "../../rnote/stroke";


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


function processParagraph(file: File, paragraph: HTMLParagraphElement,
                          offsets: Offsets, dark_mode: boolean, page_size: PageSize, zoom_level: number) {
    const texts = paragraph.getElementsByClassName("TextRun") as HTMLCollectionOf<HTMLSpanElement>;
    const converted_texts: StrokeComponent[] = []
    for (const text of texts) {
        if (text.children[0]?.innerHTML) {
            const textColor = window.getComputedStyle(text).getPropertyValue("color");

            let [_, r, g, b] = ["", "0", "0", "0"];
            try {
                [_, r, g, b] = textColor.match(COLOR_REGEXP) || ["", "0", "0", "0"];
            } catch (e) {
                console.debug(`NEX: error while matching color from ${textColor}`, e);
            }

            let color: RGB = Colors.Black;

            if (dark_mode && r === "0" && g === "0" && b === "0") {
                color = Colors.White;
            } else {
                color = {
                    r: round3(Number(r) / 255),
                    g: round3(Number(g) / 255),
                    b: round3(Number(b) / 255),
                    a: 1
                }
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

                        const x = (rect.x - offsets.x) / zoom_level;
                        const y = (rect.y - offsets.y) / zoom_level;
                        const text_width = rect.width / zoom_level;
                        // Inelegant solution to export texts max_width and max_height by side effect without
                        // scanning multiple times all the texts
                        page_size.width = Math.max(page_size.width, x + text_width);
                        page_size.height = Math.max(page_size.height, y + (rect.height / zoom_level));

                        const text_stroke: TextStroke = {
                            text: line, text_style: {
                                // The quote replacement is necessary only in Chrome
                                font_family: font.replace(/"/g, "").trim(),
                                font_size: fontSize,
                                font_weight: 100,
                                font_style: "regular",
                                color: color,
                                // FIXME: for some reason the text box isn't large enough, probably this happens because
                                //   of font incompatibility.
                                //   The * 1.23 is arbitrary and has been added as a workaround and it should be removed
                                //   in the future.
                                max_width: round3(text_width * 1.23),
                                alignment: "start",
                                ranged_text_attributes: []
                            }, transform: {
                                affine: [1, 0, 0, 0, 1, 0, x, y - (rect.height/2), 1]
                            }
                        }
                        file.new_chrono(0);
                        converted_texts.push({
                            value: {
                                bitmapimage: undefined,
                                textstroke: text_stroke,
                                brushstroke: undefined
                            }, version: 1
                        });
                    }

                }
            }
        }
    }
    return converted_texts;
}


export function convertTexts(panel: HTMLDivElement, file: File, offsets: Offsets, dark_mode: boolean, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting texts");

    const paragraphs = panel.getElementsByClassName("Paragraph") as HTMLCollectionOf<HTMLParagraphElement>;
    const converted_texts: StrokeComponent[] = [];
    for (const paragraph of paragraphs) {
        try {
            converted_texts.push(...processParagraph(file, paragraph, offsets, dark_mode, page_size, zoom_level));
        } catch (e) {
            LOG.error(`An error occurred while exporting a text paragraph: ${e}`)
        }
    }
    return converted_texts;
}