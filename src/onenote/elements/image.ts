import {OneNote} from "../onenote";
import {round3} from "../../rnote/utils";
import {blobToBase64} from "../../adapters/utils";

const IMAGE_BASE64_REGEXP = new RegExp("data:image/.*;base64,");

// RNote saves the image in a R8G8B8A8 Premultiplied format, which means that
// R,G,B are premultiplied by the percentage represented by the A value.
// From the Canvas we get the r,g,b,a sequence in a "byte" format, which has to be packed and
// converted to a string to be encoded in base64
export function pack(data: ImageDataArray) {
    let chunks = "";

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        const r = data[i] * (a / 255);
        const g = data[i + 1] * (a / 255);
        const b = data[i + 2] * (a / 255);
        chunks += `${String.fromCharCode(r)}${String.fromCharCode(g)}${String.fromCharCode(b)}${String.fromCharCode(a)}`;
    }
    return chunks;
}

export class ConvertibleImage {
    private static canvas: OffscreenCanvas | undefined;
    private static ctx: OffscreenCanvasRenderingContext2D | undefined;
    private override_width: number | undefined = undefined;
    private override_height: number | undefined = undefined;
    private scale: number;
    private resolvedImage?: HTMLImageElement;

    constructor(protected imagePromise: Promise<HTMLImageElement>, private invertColors: boolean=false, scale: number = 1, override_width: number | undefined = undefined, override_height: number | undefined = undefined) {
        this.override_width = override_width;
        this.override_height = override_height;
        this.scale = scale;
    }

    private async getResolvedImage(){
        if(!this.resolvedImage){
            this.resolvedImage = await this.imagePromise;
        }
        return this.resolvedImage;
    }

    protected getCanvas() {
        if (!Image.canvas) {
            Image.canvas = new OffscreenCanvas(0, 0);
        }
        return Image.canvas;
    }

    protected getCtx() {
        if (!Image.ctx) {
            const canvas = this.getCanvas();
            Image.ctx = canvas.getContext("2d")!;
        }
        return Image.ctx;
    }

    async asEncodedPng(): Promise<string> {
        const canvas = this.getCanvas();
        const ctx = this.getCtx();
        const image = await this.getResolvedImage();

        if(this.invertColors){
            ctx.filter = 'invert(100%)';
        }
        /* Converting non-PNG image to PNG using Canvas */
        let src = image.src;
        const isPng = new RegExp("data:image/png;base64,.*");

        if (ctx && !isPng.test(src)) {
            canvas.width = image.width * this.scale;
            canvas.height = image.height * this.scale;
            ctx.drawImage(image, 0, 0, this.override_width || image.width, this.override_height || image.height);
            const canvas_blob = await canvas.convertToBlob({type: "image/png"});
            src = await blobToBase64(canvas_blob);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return src.replace(IMAGE_BASE64_REGEXP, "");
    }

    async asEncodedR8G8B8A8Premultiplied(): Promise<string> {
        const canvas = this.getCanvas();
        const ctx = this.getCtx();
        const image = await this.getResolvedImage();

        canvas.width = image.width * this.scale;
        canvas.height = image.height * this.scale;

        ctx.drawImage(image, 0, 0, this.override_width || image.width, this.override_height || image.height);
        const raw: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const src = btoa(pack(raw.data));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return src.replace(IMAGE_BASE64_REGEXP, "");
    }

    async finalHeight(): Promise<number> {
        const image = await this.getResolvedImage();
        return image.height * this.scale;
    }

    async finalWidth(): Promise<number> {
        const image = await this.getResolvedImage();
        return image.width * this.scale;
    }
}

export class Image extends ConvertibleImage {
    readonly document: OneNote;
    readonly container: HTMLDivElement;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly image: HTMLImageElement;

    constructor(document: OneNote, container: HTMLDivElement) {
        super(new Promise<HTMLImageElement>((resolve, _) => {
            resolve((container.getElementsByClassName("WACImage") as HTMLCollectionOf<HTMLImageElement>)[0])
        }));
        this.document = document;
        this.container = container;
        this.image = (container.getElementsByClassName("WACImage") as HTMLCollectionOf<HTMLImageElement>)[0];



        const offsets = this.document.offsets;
        const zoom = this.document.zoom;

        // OneNote uses (at least?) two types of positioning method for the images:
        // Absolute: coordinates are inside the WACImageContainer style;
        // Relative: the image is shifted by an offset from the main WACViewPanel.
        // We try first with the absolute position, if it's not found, we try to calculate the relative position,
        // converting it to an (hopefully correct) absolute one
        const x = Number(container.style.left.replace("px", "")) || 0;
        const y = Number(container.style.top.replace("px", "")) || 0;

        const image_boundaries = this.image.getBoundingClientRect();
        this.x = round3(x || ((image_boundaries.x - offsets.x) / zoom));
        this.y = round3(y || ((image_boundaries.y - offsets.y) / zoom));

        this.width = this.image.width;
        this.height = this.image.height;
    }


}