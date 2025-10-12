import {Image} from "../../xournalpp/image";
import {LOG} from "../converter";
import {Layer} from "../../xournalpp/page";
import {Offsets, PageSize} from "./xournalpp-adapter";

export const IMAGE_BASE64_REGEXP = new RegExp("data:image/.*;base64,");


export function convertImages(panel: HTMLDivElement, layer: Layer, offsets: Offsets, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting images");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const converted_images: Image[] = [];
    const image_containers = panel.getElementsByClassName("WACImageContainer") as HTMLCollectionOf<HTMLDivElement>;
    LOG.info(`Found ${image_containers.length} image(s)`);
    for (const container of image_containers) {
        // OneNote uses (at least?) two type of positioning method for the images:
        // Absolute: coordinates are inside the WACImageContainer style;
        // Relative: the image is shifted by an offset from the main WACViewPanel.
        // We try first with the absolute position, if it's not found we try to calculate the relative position,
        // converting it to an (hopefully correct) absolute one
        const x: number = Number(container.style.left.replace("px", "")) || 0;
        const y: number = Number(container.style.top.replace("px", "")) || 0;
        const image: HTMLImageElement = (container.getElementsByClassName("WACImage") as HTMLCollectionOf<HTMLImageElement>)[0];
        const image_boundaries = image.getBoundingClientRect();

        /* Converting non-PNG image to PNG using Canvas */
        let src = image.src;
        const isPng = new RegExp("data:image/png;base64,.*");
        if (ctx && !isPng.test(src)) {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0, image.width, image.height);
            src = canvas.toDataURL("image/png", 0.8);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const data = src.replace(IMAGE_BASE64_REGEXP, "");

        const real_x = (x || ((image_boundaries.x - offsets.x) / zoom_level));
        const real_y = (y || ((image_boundaries.y - offsets.y) / zoom_level));

        const converted_image = layer.addImage(
            data,
            real_x,
            real_y,
            image.width,
            image.height
        );
        converted_images.push(converted_image);

        // Inelegant solution to export images max_width and max_height by side effect without
        // scanning multiple times all the images
        page_size.width = Math.max(page_size.width, converted_image.right);
        page_size.height = Math.max(page_size.height, converted_image.bottom);
    }
    return converted_images
}
