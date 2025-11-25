import {Log} from "../log/log";
import {ConvertMessage, DocumentFormat} from "../messages/convert";
import {OneNoteAdapter} from "./onenote";
import {XournalppAdapter} from "./xournalpp/xournalpp-adapter";
import {DownloadableDocument} from "../models/document";
import {RNoteAdapter} from "./rnote/rnote-adapter";


export const COLOR_REGEXP = new RegExp("rgb\\(([0-9]{1,3}), ?([0-9]{1,3}), ?([0-9]{1,3})\\)");

// TODO: replace with something better
export const LOG = new Log();

function buildAdapter(options: ConvertMessage, panel: HTMLDivElement): OneNoteAdapter {
    switch (options.format) {
        case DocumentFormat.xopp:
            return new XournalppAdapter(options, panel);
        case DocumentFormat.rnote:
            return new RNoteAdapter(options, panel);
        case DocumentFormat.xoz:
        default:
            throw Error("Not implemented");
    }
}

export async function convertNote(message: ConvertMessage): Promise<DownloadableDocument> {
    LOG.info("Conversion started");

    /* Tries to retrieve the OneNote document container */
    const panel = document.getElementById("WACViewPanel") as HTMLDivElement;
    if (!panel) {
        LOG.error("Conversion failed: cannot find WACViewPanel");
        return new Promise((_, reject) => {
            reject("Conversion failed: cannot find WACViewPanel");
        });
    }

    const adapter = buildAdapter(message, panel)
    try{
        return await adapter.export();
    }catch(err){
        await adapter.progressTracker.error();
        throw err;
    }

}

