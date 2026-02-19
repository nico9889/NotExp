import {ConvertMessage} from "../../messages/convert";
import {OneNoteAdapter} from "../onenote";
import {getTitle, getZoomLevel} from "../../onenote/utils";
import {convertStrokes} from "./strokes";
import {round3} from "../../rnote/utils";
import {DownloadableDocument} from "../../models/document";
import {File} from "../../rnote/file";
import {Colors} from "../../rnote/utils";
import {convertTexts} from "./texts";
import {convertImages} from "./images";
import {convertMathMLBlocks} from "./math";
import {StrokeComponent} from "../../rnote/stroke";

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


        const panel_boundaries = panel.getBoundingClientRect();
        this.offsets = {
            x: panel_boundaries.x - panel.scrollLeft,
            y: panel_boundaries.y - panel.scrollTop
        }

        const self = this;

        // FIXME: this smells...
        const stroke_generator = async function* () : AsyncGenerator<StrokeComponent> {
            // For some reason RNote generates always an empty StrokeComponent
            self.document.new_chrono(null);
            yield {
                value: null,
                version: 0,
            };

            if (self.options.texts) {
                for (const texts of convertTexts(self.panel, self.document, self.offsets, self.options.texts_dark_mode, self.pageSize, self.zoomLevel)) {
                    for (const text of texts) {
                        yield text;
                    }
                }
            }
            await self.progressTracker.bump();

            if (self.options.images) {
                for (const image of convertImages(self.panel, self.document, self.offsets, self.pageSize, self.zoomLevel)) {
                    yield image;
                }
            }
            await self.progressTracker.bump();

            if (self.options.strokes) {
                for (const stroke of convertStrokes(self.panel, self.document, self.options.strokes_dark_mode, self.pageSize)) {
                    yield stroke;
                }
            }
            await self.progressTracker.bump();

            if (self.options.maths) {
                for await (const math of convertMathMLBlocks(self.panel, self.document, self.offsets, self.options.math_dark_mode, self.options.math_quality,
                    self.pageSize, self.zoomLevel)) {
                    yield math;
                }
            }
            await self.progressTracker.bump();
        };
        this.document = new File(this.title,stroke_generator );
    }

    updatePageBoundaries(element:HTMLParagraphElement | HTMLDivElement | SVGElement | HTMLSpanElement, offsets: Offsets ){
        const rect = element.getBoundingClientRect();
        const x = (rect.x - offsets.x) / this.zoomLevel;
        const y = (rect.y - offsets.y) / this.zoomLevel;
        const current_max = this.pageSize;
        current_max.width = Math.max(current_max.width, x + rect.width / this.zoomLevel);
        current_max.height = Math.max(current_max.height, y + rect.height / this.zoomLevel);
    }

    async export(): Promise<DownloadableDocument> {
        const page_color = (this.options.dark_page) ? Colors.Black : Colors.White;
        this.document.set_background_color(page_color);
        const offsets = this.offsets;

        // Pass 1: Calculate page size
        if (this.options.texts) {
            const paragraphs = (this.panel.getElementsByClassName("Paragraph") as HTMLCollectionOf<HTMLParagraphElement>);
            for(const paragraph of paragraphs){
                this.updatePageBoundaries(paragraph, offsets)
            }
        }
        if (this.options.images) {
            const images = (this.panel.getElementsByClassName("WACImageContainer") as HTMLCollectionOf<HTMLDivElement>);
            for(const image of images) {
                this.updatePageBoundaries(image, offsets)
            }
        }
        if (this.options.strokes) {
            const strokes = this.panel.getElementsByClassName("InkStrokeOuterElement") as HTMLCollectionOf<SVGElement>;
            for(const stroke of strokes) {
                this.updatePageBoundaries(stroke, offsets)
            }
        }
        if (this.options.maths) {
            const math_containers = this.panel.getElementsByClassName("MathSpan") as HTMLCollectionOf<HTMLSpanElement>;
            for(const math_container of math_containers) {
                this.updatePageBoundaries(math_container, offsets)
            }
        }

        const width = this.pageSize.width + 5;
        const height = this.pageSize.height + 5;
        this.document.set_size(width, height);

        await this.document.compress()
        await this.progressTracker.bump();
        return this.document;
    }
}