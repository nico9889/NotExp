import {OneNote} from "../../onenote/onenote";
import {LOG} from "../converter";
import {ProgressTracker} from "../progress";
import {Element, IndexGenerator, idGenerator, getNonce} from "../../excalidraw/elements";
import {File} from "../../excalidraw/document";
import {round3} from "../../rnote/utils";

async function writeImagesProperties(onenote: OneNote, index: IndexGenerator, chunks: string[],): Promise<number> {
    let exported = 0;
    for (const image of onenote.getImages()) {
        const element: Element = {
            id: idGenerator().next().value,
            type: "image",
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
            angle: 0,
            strokeColor: "transparent",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: [],
            frameId: null,
            index: index.next(),
            roundness: null,
            seed: 0,
            version: 0,
            versionNonce: getNonce(),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            status: "pending",
            fileId: await image.uuid(),
            scale: [1, 1],
            crop: null
        }
        if (exported) {
            chunks.push(',');
        }
        const output = JSON.stringify(element);
        chunks.push(output);
        exported += 1;
    }
    return exported;
}


async function writeImagesFiles(onenote: OneNote, chunks: string[]) {
    let exported = 0;
    for (const image of onenote.getImages()) {
        const uuid = await image.uuid();
        const file: File = {
            mimeType: "image/png",
            id: uuid,
            dataURL: `data:image/png;base64,${await image.asEncodedPng()}`,
            created: Date.now(),
            lastRetrieved: Date.now(),
        }
        if (exported) {
            chunks.push(',');
        }

        const output = `"${uuid}": ${JSON.stringify(file)}`;
        chunks.push(output);
        exported += 1;
    }
}


/*
async function writeMath(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const math of onenote.getMath()) {
        const width = await math.width();
        const height = await math.height();

        const half_width = round3(width / 2);
        const half_height = round3(height / 2);

        const stroke_component: StrokeComponent = {
            value: {
                brushstroke: undefined,
                textstroke: undefined,
                bitmapimage: {
                    image: {
                        data: await math.asEncodedR8G8B8A8Premultiplied(),
                        memory_format: "R8g8b8a8Premultiplied",
                        pixel_height: await math.finalHeight(),
                        pixel_width: await math.finalWidth(),
                        rectangle: {
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
                    }, rectangle: {
                        cuboid: {
                            half_extents: [half_width, half_height],
                        },
                        transform: {
                            affine: [
                                1, 0, 0,
                                0, 1, 0,
                                math.x + half_width, math.y + half_height, 1
                            ]
                        }
                    }
                }
            },
            version: 1
        }
        updateChrono(rnote, "image");
        chunks.push(encoder.encode(','));
        const output = JSON.stringify(stroke_component);
        chunks.push(encoder.encode(output));
        exported += 1;
    }
    return exported;
}
 */
async function writeStrokes(onenote: OneNote, index: IndexGenerator, chunks: string[]): Promise<number> {
    let exported = 0;
    for (const stroke of onenote.getStrokes()) {
        const element: Element = {
            id: idGenerator().next().value,
            type: "freedraw",
            x: stroke.viewBox.x,
            y: stroke.viewBox.y,
            width: 0,
            height: 0,
            angle: 0,
            strokeColor: stroke.color.hex(),
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeSharpness: "sharp",
            strokeWidth: stroke.width/8,
            strokeStyle: "solid",
            roughness: 0,
            opacity: stroke.color.a * 100,
            groupIds: [],
            roundness: null,
            frameId: null,
            index: index.next(),
            seed: getNonce(),
            version: 0,
            versionNonce: getNonce(),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            points: [],
            pressures: []
        }

        const points: [number, number][] = [];

        const points_generator = stroke.points();

        const first: [number, number] = points_generator.next().value
        let minX = first[0];
        let maxX = first[0];
        let minY = first[1];
        let maxY = first[1];

        for (const point of points_generator) {
            const [px, py] = point;
            points.push([px, py]);
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
        }

        if (points.length) {
            element.x = minX;
            element.y = minY;
            element.width = maxX - minX;
            element.height = maxY - minY;
            element.points = points.map(([px, py]) => [round3(px - minX), round3(py - minY)]);

            if (exported) {
                chunks.push(',');
            }
            element.version = element.points.length + 2;

            const output = JSON.stringify(element);
            chunks.push(output);
            exported += 1;
        }
    }
    return exported;
}

/*
async function writeTexts(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;

    for (const paragraph of onenote.getParagraphs()) {
        for (const text of paragraph.getTexts()) {
            for (const chunk of text.chunks()) {
                const stroke_component: StrokeComponent = {
                    value: {
                        brushstroke: undefined,
                        textstroke: {
                            text: chunk.line,
                            text_style: {
                                // The quote replacement is necessary only in Chrome
                                font_family: text.font,
                                font_size: text.fontSize,
                                font_weight: 100,
                                font_style: "regular",
                                color: text.color,
                                // FIXME: for some reason the text box isn't large enough, probably this happens because
                                //   of font incompatibility.
                                //   The * 1.23 is arbitrary and has been added as a workaround and it should be removed
                                //   in the future.
                                max_width: round3(chunk.width * 1.23),
                                alignment: "start",
                                ranged_text_attributes: []
                            }, transform: {
                                affine: [1, 0, 0, 0, 1, 0, chunk.x, chunk.y - (chunk.height / 2), 1]
                            }
                        },
                        bitmapimage: undefined
                    }, version: 1
                }
                updateChrono(rnote, 0);
                chunks.push(encoder.encode(','));
                const output = JSON.stringify(stroke_component);
                chunks.push(encoder.encode(output));
                exported += 1;
            }
        }
    }
    return exported;
}
 */

export async function convertToExcalidraw(onenote: OneNote, progress: ProgressTracker): Promise<Blob> {

    const document_start = "{\"appState\": {\"gridModeEnabled\": false},";
    const document_end = "\"source\": \"https://codeberg.org/nico9889/NotExp\", \"type\": \"excalidraw\",\"version\": 2}";

    const indexGenerator = new IndexGenerator();

    const chunks: string[] = [];

    try {
        let exported = 0;
        // Write the file "header" data
        chunks.push(document_start);

        chunks.push("\"elements\":[");


        await progress.bump();
        const images_exported = await writeImagesProperties(onenote, indexGenerator, chunks);
        exported += images_exported;
        if (images_exported) {
            chunks.push(",")
        }

        const strokes_exported = await writeStrokes(onenote, indexGenerator, chunks);
        exported += strokes_exported;
        if (strokes_exported) {
            chunks.push(",");
        }

        if (chunks[chunks.length - 1] === ",") {
            chunks.pop();
        }

        chunks.push("],");

        chunks.push("\"files\": {")

        await writeImagesFiles(onenote, chunks);
        await progress.bump();

        chunks.push("},")

        chunks.push(document_end);
        await progress.bump();

        LOG.info(`Exported ${exported} elements`);
    } finally {
    }

    await progress.bump();
    // The GZIP file is associated with a phantom Anchor element to be exported
    LOG.info("Exporting file");
    return new Blob(chunks as any, {type: "application/json"});
}