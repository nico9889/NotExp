import {getTitle, getZoomLevel} from "./utils";
import {Offsets} from "../adapters/rnote/rnote-adapter";
import {ConvertMessage} from "../messages/convert";
import {Paragraph} from "./elements/paragraph";
import {Stroke} from "./elements/stroke";
import {Image} from "./elements/image";
import {Math as OneNoteMath} from "./elements/math";
import {round3} from "../rnote/utils";

export interface PageSize {
    width: number,
    height: number
}

export class OneNote {
    readonly title: string;
    readonly size: PageSize;
    readonly zoom: number;
    readonly offsets: Offsets;

    constructor(readonly options: ConvertMessage, private panel: HTMLDivElement) {
        this.title = getTitle();
        this.size = {width: 0, height: 0};

        this.zoom = getZoomLevel();

        const panel_boundaries = panel.getBoundingClientRect();
        this.offsets = {
            x: panel_boundaries.x - panel.scrollLeft,
            y: panel_boundaries.y - panel.scrollTop
        }

        this.calculatePageSize(this.offsets);
    }

    private calculatePageSize(offsets: Offsets) {
        // Pass 1: Calculate page size
        if (this.options.texts) {
            const paragraphs = (this.panel.getElementsByClassName("Paragraph") as HTMLCollectionOf<HTMLParagraphElement>);
            for (const paragraph of paragraphs) {
                this.updatePageBoundaries(paragraph, offsets)
            }
        }
        if (this.options.images) {
            const images = (this.panel.getElementsByClassName("WACImageContainer") as HTMLCollectionOf<HTMLDivElement>);
            for (const image of images) {
                this.updatePageBoundaries(image, offsets)
            }
        }
        if (this.options.strokes) {
            const strokes = this.panel.getElementsByClassName("InkStrokeOuterElement") as HTMLCollectionOf<SVGElement>;
            for (const stroke of strokes) {
                this.updatePageBoundaries(stroke, offsets)
            }
        }
        if (this.options.maths) {
            const math_containers = this.panel.getElementsByClassName("MathSpan") as HTMLCollectionOf<HTMLSpanElement>;
            for (const math_container of math_containers) {
                this.updatePageBoundaries(math_container, offsets)
            }
        }

        // Add a small additional safety margin
        this.size.width += 5;
        this.size.height += 5;
    }

    private updatePageBoundaries(element: HTMLParagraphElement | HTMLDivElement | SVGElement | HTMLSpanElement, offsets: Offsets) {
        const rect = element.getBoundingClientRect();
        const x = (rect.x - offsets.x) / this.zoom;
        const y = (rect.y - offsets.y) / this.zoom;
        const current_max = this.size;
        current_max.width = round3(Math.max(current_max.width, x + rect.width / this.zoom));
        current_max.height = round3(Math.max(current_max.height, y + rect.height / this.zoom));
    }

    * getStrokes() {
        if (this.options.strokes) {
            const strokes = this.panel.getElementsByClassName("InkStrokeOuterElement") as HTMLCollectionOf<SVGElement>;
            for (const stroke of strokes) {
                yield new Stroke(this, stroke);
            }
        }
    }

    * getImages() {
        if (this.options.images) {
            const images = (this.panel.getElementsByClassName("WACImageContainer") as HTMLCollectionOf<HTMLDivElement>);
            for (const image of images) {
                yield new Image(this, image);
            }
        }
    }

    * getParagraphs() {
        if (this.options.texts) {
            const paragraphs = (this.panel.getElementsByClassName("Paragraph") as HTMLCollectionOf<HTMLParagraphElement>);
            for (const paragraph of paragraphs) {
                yield new Paragraph(this, paragraph);
            }
        }
    }

    * getMath() {
        if (this.options.maths) {
            const math_containers = this.panel.getElementsByClassName("MathSpan") as HTMLCollectionOf<HTMLSpanElement>;
            for (const math_container of math_containers) {
                yield new OneNoteMath(this, math_container);
            }
        }
    }
}