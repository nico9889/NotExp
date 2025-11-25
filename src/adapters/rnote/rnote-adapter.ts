import {ConvertMessage} from "../../messages/convert";
import {OneNoteAdapter} from "../onenote";
import {getTitle, getZoomLevel} from "../../onenote/utils";
import {convertStrokes} from "./strokes";
import {DownloadableDocument} from "../../models/document";
import {File} from "../../rnote/file";
import {Colors} from "../../rnote/utils";
import {StrokeComponent} from "../../rnote/stroke";
import {convertTexts} from "./texts";
import {convertImages} from "./images";
import {convertMathMLBlocks} from "./math";

export interface PageSize {
    width: number,
    height: number
}

export interface Offsets {
    x: number,
    y: number
}

export class RNoteAdapter extends OneNoteAdapter {
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
    private readonly document: File;

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
        this.document = new File(this.title);

        const panel_boundaries = panel.getBoundingClientRect();
        this.offsets = {
            x: panel_boundaries.x - panel.scrollLeft,
            y: panel_boundaries.y - panel.scrollTop
        }
    }

    async export(): Promise<DownloadableDocument> {
        const converted_strokes: StrokeComponent[] = [];

        // For some reason RNote generates always an empty StrokeComponent
        this.document.new_chrono(null);
        converted_strokes.push({
            value: null,
            version: 0,
        })

        const page_color = (this.options.dark_page) ? Colors.Black : Colors.White;
        this.document.set_background_color(page_color);
        const offsets = this.offsets;

        if(this.options.texts) {
            converted_strokes.push(...convertTexts(this.panel, this.document, offsets, this.options.texts_dark_mode, this.pageSize, this.zoomLevel));
        }
        await this.progressTracker.bump();

        if(this.options.images) {
            converted_strokes.push(...convertImages(this.panel, this.document, offsets, this.pageSize, this.zoomLevel));
        }
        await this.progressTracker.bump();

        if(this.options.strokes){
            converted_strokes.push(...convertStrokes(this.panel, this.document, this.options.strokes_dark_mode, this.pageSize));
        }
        await this.progressTracker.bump();

        if(this.options.maths){
            converted_strokes.push(...await convertMathMLBlocks(this.panel, this.document, offsets, this.options.math_dark_mode, this.options.math_quality,
                this.pageSize, this.zoomLevel));
        }
        await this.progressTracker.bump();
        const width = this.pageSize.width + 5;
        const height = this.pageSize.height + 5;

        this.document.replace_strokes(converted_strokes);

        this.document.set_size(width, height);

        await this.document.compress()

        await this.progressTracker.bump();

        return this.document;
    }
}