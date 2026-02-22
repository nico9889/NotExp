import {Log} from "../log/log";
import {ConvertMessage, DocumentFormat, formatToExt} from "../messages/convert";
import {convertToRnote} from "./rnote/rnote-adapter";
import {OneNote} from "../onenote/onenote";
import {sanitizeFileName} from "./utils";
import {ProgressTracker} from "./progress";
import {convertToXopp} from "./xournalpp/xournalpp-adapter";

const PROGRESS = new ProgressTracker(6);

export const COLOR_REGEXP = new RegExp("rgb\\(([0-9]{1,3}), ?([0-9]{1,3}), ?([0-9]{1,3})\\)");

// TODO: replace with something better
export const LOG = new Log();

function selectAdapter(options: ConvertMessage): ((onenote: OneNote, progress: ProgressTracker) => Promise<Blob>) {
    switch (options.format) {
        case DocumentFormat.xopp:
            return convertToXopp;
        case DocumentFormat.rnote:
            return convertToRnote;
        case DocumentFormat.xoz:
        default:
            throw Error("Not implemented");
    }
}

function downloadBlob(blob: Blob, filename: string, format: DocumentFormat) {
    const pom = document.createElement("a");
    pom.setAttribute('href', URL.createObjectURL(blob));
    LOG.success("File exported successfully");

    if (!pom) {
        LOG.error("No file converted. Cannot download.");
        return;
    }

    pom.setAttribute('download', `${sanitizeFileName(filename)}.${formatToExt(format)}`);
    pom.click();
}

export async function convertNote(message: ConvertMessage) {
    await PROGRESS.reset();
    LOG.info("Conversion started");

    /* Tries to retrieve the OneNote document container */
    const panel = document.getElementById("WACViewPanel") as HTMLDivElement;
    if (!panel) {
        LOG.error("Conversion failed: cannot find WACViewPanel");
        return new Promise((_, reject) => {
            reject("Conversion failed: cannot find WACViewPanel");
        });
    }

    const onenote = new OneNote(message, panel);

    const adapter = selectAdapter(message)
    try {
        await PROGRESS.bump();
        const blob = await adapter(onenote, PROGRESS);
        downloadBlob(blob, onenote.title, onenote.options.format);
    } catch (err) {
        await PROGRESS.error();
        throw err;
    }

}

