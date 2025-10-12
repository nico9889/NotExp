import {ConvertMessage} from "../../messages/convert";
import {OneNoteAdapter} from "../onenote";
import {getTitle, getZoomLevel} from "../../onenote/utils";
import {Document} from "../../xournalpp/document";
import {Color} from "../../xournalpp/utils";
import {BackgroundType} from "../../xournalpp/page";
import {convertTexts} from "./texts";
import {convertImages} from "./images";
import {convertStrokes} from "./strokes";
import {convertMathMLBlocks} from "./math";
import {DownloadableDocument} from "../../models/document";

export interface PageSize {
    width: number,
    height: number
}

export interface Offsets {
    x: number,
    y: number
}

export class XournalppAdapter extends OneNoteAdapter {
    private readonly pageSize: PageSize = {
        width: 0,
        height: 0
    };
    private readonly offsets: Offsets = {
        x: 0,
        y: 0
    }
    private readonly title: string;
    private readonly zoomLevel: number;
    private readonly document: Document;

    constructor(message: ConvertMessage, panel: HTMLDivElement) {
        const conversion_steps = 5;     // 1) texts, 2) images, 3) strokes, 4) math, 5) GZip
        super(message, panel, conversion_steps);
        this.title = message.filename;

        if (!this.title) {
            try {
                this.title = getTitle();
            } catch (e) {
                console.error(`NEX: ${e}`);
            }
            if (!this.title) {
                this.title = document.title;
            }
        }
        this.zoomLevel = getZoomLevel();
        this.document = new Document(this.title);

        const panel_boundaries = panel.getBoundingClientRect();
        this.offsets = {
            x: panel_boundaries.x - panel.scrollLeft,
            y: panel_boundaries.y - panel.scrollTop
        }
    }

    async export(): Promise<DownloadableDocument> {
        const page_color = (this.options.dark_page) ? Color.Black : Color.White;
        const page = this.document.addPage(BackgroundType.Solid, page_color);
        let layer = page.addLayer();
        const separateLayers = this.options.separateLayers;
        const offsets = this.offsets;
        if (separateLayers) {
            layer.name = "Texts"
        } else {
            layer.name = "All elements";
        }
        convertTexts(this.panel, layer, offsets, this.options.texts_dark_mode, this.pageSize, this.zoomLevel);
        await this.progressTracker.bump();

        if (separateLayers) {
            layer = page.addLayer();
            layer.name = "Images";
        }
        convertImages(this.panel, layer, offsets, this.pageSize, this.zoomLevel);
        await this.progressTracker.bump();

        if (separateLayers) {
            layer = page.addLayer();
            layer.name = "Strokes";
        }
        convertStrokes(this.panel, layer, this.options.strokes_dark_mode, this.pageSize);
        await this.progressTracker.bump();

        if (separateLayers) {
            layer = page.addLayer();
            layer.name = "Math";
        }
        await convertMathMLBlocks(this.panel, layer, offsets, this.options.math_dark_mode, this.options.math_quality,
            this.pageSize, this.zoomLevel);
        await this.progressTracker.bump();
        page.width = this.pageSize.width + 5;
        page.height = this.pageSize.height + 5;
        // Trimming empty layers
        page.trim();

        await this.document.compress()

        await this.progressTracker.bump();

        return this.document;
    }


}