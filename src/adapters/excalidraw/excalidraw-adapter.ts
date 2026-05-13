import {OneNote} from "../../onenote/onenote";
import {LOG} from "../converter";
import {ProgressTracker} from "../progress";
import {IndexGenerator, idGenerator, getNonce} from "../../excalidraw/elements";
import {File} from "../../excalidraw/document";
import {round3} from "../../rnote/utils";
import {
    ExcalidrawFreeDrawElement,
    ExcalidrawImageElement,
    ExcalidrawTextElement
} from "@excalidraw/element/types";
import {Radians, LocalPoint} from "@excalidraw/math";
import {FONT_FAMILY, FONT_FAMILY_FALLBACKS, FONT_FAMILY_GENERIC_FALLBACKS} from "@excalidraw/common";

async function writeImagesProperties(onenote: OneNote, index: IndexGenerator, chunks: string[]): Promise<number> {
    let exported = 0;
    for (const image of onenote.getImages()) {
        const element: ExcalidrawImageElement = {
            id: idGenerator().next().value,
            type: "image",
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
            angle: 0 as Radians,
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


/* TODO
async function writeMathProperties(onenote: OneNote, index: IndexGenerator, chunks: string[]): Promise<number> {
    let exported = 0;
    for (const math of onenote.getMath()) {
        const width = await math.width();
        const height = await math.height();

        chunks.push(encoder.encode(','));
        const output = JSON.stringify(element);
        chunks.push(encoder.encode(output));
        exported += 1;
    }
    return exported;
}
 */
async function writeStrokes(onenote: OneNote, index: IndexGenerator, chunks: string[]): Promise<number> {
    let exported = 0;
    for (const stroke of onenote.getStrokes()) {
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
            if (exported) {
                chunks.push(',');
            }

            const element: ExcalidrawFreeDrawElement = {
                id: idGenerator().next().value,
                type: "freedraw",
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                angle: 0 as Radians,
                strokeColor: stroke.color.hex(),
                backgroundColor: "transparent",
                fillStyle: "solid",
                strokeWidth: stroke.width/8,
                strokeStyle: "solid",
                roughness: 0,
                opacity: stroke.color.a * 100,
                groupIds: [],
                roundness: null,
                frameId: null,
                index: index.next(),
                seed: getNonce(),
                version: points.length + 2,
                versionNonce: getNonce(),
                isDeleted: false,
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false,
                points: points.map(([px, py]) => [round3(px - minX), round3(py - minY)] as unknown as LocalPoint),
                pressures: [],
                simulatePressure: false,
                lastCommittedPoint: null,
            }

            const output = JSON.stringify(element);
            chunks.push(output);
            exported += 1;
        }


    }
    return exported;
}

function getFontFamilyId(fontFamily: string){
    // @ts-ignore
    const id: number = FONT_FAMILY[fontFamily] ?? FONT_FAMILY_FALLBACKS[fontFamily] ?? FONT_FAMILY_GENERIC_FALLBACKS[fontFamily];
    if(id === undefined){
        console.warn(`No Font ID found for font-family '${fontFamily}'`);
        return FONT_FAMILY.Excalifont;
    }
    return id;
}

async function writeTexts(onenote: OneNote, index: IndexGenerator, chunks: string[]): Promise<number> {
    let exported = 0;

    for (const paragraph of onenote.getParagraphs()) {
        for (const text of paragraph.getTexts()) {
            const fontFamily = text.fontFamily;
            for(const chunk of text.chunks()){
                const element: ExcalidrawTextElement = {
                    autoResize: false,
                    containerId: null,
                    // @ts-ignore
                    fontFamily: getFontFamilyId(fontFamily),
                    fontSize: text.fontSize, // TODO: check why this is wrong
                    lineHeight: 1 as ExcalidrawTextElement["lineHeight"],
                    originalText: chunk.line,
                    text: chunk.line,
                    textAlign: "",
                    verticalAlign: "",
                    id: idGenerator().next().value,
                    type: "text",
                    x: chunk.x,
                    y: chunk.y,
                    width: chunk.width,
                    height: chunk.height,
                    angle: 0 as Radians,
                    strokeColor: text.color.hex(),
                    backgroundColor: "transparent",
                    fillStyle: "solid",
                    strokeWidth: 2,
                    strokeStyle: "solid",
                    roughness: 0,
                    opacity: 100,
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
                    locked: false
                }
                if (exported) {
                    chunks.push(',');
                }
                const output = JSON.stringify(element);
                chunks.push(output);
                exported += 1;
            }

        }
    }
    return exported;
}

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

        const texts_exported = await writeTexts(onenote, indexGenerator, chunks);
        exported += texts_exported;
        if (texts_exported) {
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