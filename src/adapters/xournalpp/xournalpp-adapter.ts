import {Document} from "../../xournalpp/document";
import {Color, RGBAColor} from "../../xournalpp/utils";
import {BackgroundType, Layer, Page} from "../../xournalpp/page";
import {OneNote} from "../../onenote/onenote";
import {ProgressTracker} from "../progress";
import {Image as XImage} from "../../xournalpp/image";
import {TexImage} from "../../xournalpp/teximage";
import {Stroke, Tool} from "../../xournalpp/stroke";
import {Text} from "../../xournalpp/text";
import {LOG} from "../converter";

async function writeImages(onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const image of onenote.getImages()) {

        const ximage = new XImage(
            await image.asEncodedPng(),
            image.x, image.y, image.width, image.height
        );
        await writer.write(encoder.encode(ximage.element.outerHTML));
        exported += 1;
    }
    return exported;
}


async function writeMath(onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const math of onenote.getMath()) {

        const xmath = new TexImage(
            math.toLatex(),
            await math.asEncodedPng(),
            math.x,
            math.y,
            await math.width(),
            await math.height()
        )
        await writer.write(encoder.encode(xmath.element.outerHTML));
        exported += 1;
    }
    return exported;
}

async function writeStrokes(onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const stroke of onenote.getStrokes()) {
        const xstroke = new Stroke();

        for (const point of stroke.points()) {
            xstroke.addPoint(point[0], point[1]);
        }

        xstroke.tool = (stroke.color.a < 1) ? Tool.Highlighter : Tool.Pen;
        xstroke.width = stroke.width;
        xstroke.color = new RGBAColor(
            Math.floor(stroke.color.r * 255),
            Math.floor(stroke.color.g * 255),
            Math.floor(stroke.color.b * 255),
            Math.floor(stroke.color.a * 255)
        )

        await writer.write(encoder.encode(xstroke.element.outerHTML));
        exported += 1;
    }
    return exported;
}

async function writeTexts(onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;

    for (const paragraph of onenote.getParagraphs()) {
        for (const text of paragraph.getTexts()) {
            for (const chunk of text.chunks()) {
                const xtext = new Text(
                    chunk.line,
                    text.font,
                    text.fontSize,
                    chunk.x,
                    chunk.y,
                    new RGBAColor(
                        Math.floor(text.color.r),
                        Math.floor(text.color.g),
                        Math.floor(text.color.b),
                        Math.floor(text.color.a)
                    ),
                );
                await writer.write(encoder.encode(xtext.element.outerHTML));
                exported += 1;
            }
        }
    }
    return exported;
}

export async function convertToXopp(onenote: OneNote, progress: ProgressTracker): Promise<Blob> {
    console.debug("Converting to Xournal++");
    const textEncoder = new TextEncoder();
    const cs = new CompressionStream("gzip");
    console.debug("Compression stream created, TextEncoder created");

    // Start reading from the compression stream "concurrently"
    // This is needed otherwise the CompressionStream get stuck, as it cannot buffer the received data.
    const chunks: Uint8Array[] = [];
    const readerPromise = (async () => {
        const reader = cs.readable.getReader();
        try {
            let finished = false;
            while (!finished) {
                const {done, value} = await reader.read();
                finished = done;
                if (value !== undefined)
                    chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }
    })();

    // Get the writer to pipe the data inside the CompressionStream
    const writer = cs.writable.getWriter();
    console.debug("Writer created, Reader created");
    try {
        const document = new Document(onenote.title);
        console.debug("Document created");
        await writer.write(textEncoder.encode(document.xmlOpen()));

        console.debug("Document XML opened");

        const page = new Page(BackgroundType.Solid, (onenote.options.dark_page) ? Color.Black : Color.White);
        page.width = onenote.size.width;
        page.height = onenote.size.height;

        await writer.write(textEncoder.encode(page.xmlOpen()));
        let layer = new Layer();
        layer.name = (onenote.options.separateLayers) ? "Text" : "All elements";
        await writer.write(textEncoder.encode(layer.xmlOpen()));
        let exported = 0;
        exported += await writeTexts(onenote, writer, textEncoder);

        await progress.bump();
        if (onenote.options.separateLayers) {
            await writer.write(textEncoder.encode(layer.xmlClose()));
            layer.name = "Images";
            await writer.write(textEncoder.encode(layer.xmlOpen()));
        }

        exported += await writeImages(onenote, writer, textEncoder);
        await progress.bump();
        if (onenote.options.separateLayers) {
            await writer.write(textEncoder.encode(layer.xmlClose()));
            layer.name = "Stroke";
            await writer.write(textEncoder.encode(layer.xmlOpen()));
        }

        exported += await writeStrokes(onenote, writer, textEncoder);
        await progress.bump();
        if (onenote.options.separateLayers) {
            await writer.write(textEncoder.encode(layer.xmlClose()));
            layer.name = "Math";
            await writer.write(textEncoder.encode(layer.xmlOpen()));
        }

        exported += await writeMath(onenote, writer, textEncoder);
        await progress.bump();

        await writer.write(textEncoder.encode(layer.xmlClose()));

        LOG.info(`Exported ${exported} elements`);

        await writer.write(textEncoder.encode(page.xmlClose()));
        await writer.write(textEncoder.encode(document.xmlClose()));
    } finally {
        await writer.close();
    }

    await readerPromise;

    await progress.bump();
    // The GZIP file is associated with a phantom Anchor element to be exported
    LOG.info("Exporting file");
    return new Blob(chunks as any, {type: "application/gzip"});
}
