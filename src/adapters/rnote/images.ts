import {Rectangle} from "../../rnote/image";
import {LOG} from "../converter";
import {File} from "../../rnote/file";
import {Offsets, PageSize} from "./rnote-adapter";
import {StrokeComponent} from "../../rnote/stroke";
import {round3} from "../../rnote/utils";

export const IMAGE_BASE64_REGEXP = new RegExp("data:image/.*;base64,");

// RNote saves the image in a R8G8B8A8 Premultiplied format, which means that
// R,G,B are premultiplied by the percentage represented by the A value.
// From the Canvas we get the r,g,b,a sequence in a "byte" format, which has to be packed and
// converted to a string to be encoded in base64
export function pack(data: ImageDataArray) {
    const chunks = []

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        const r = data[i] * (a / 255);
        const g = data[i + 1] * (a / 255);
        const b = data[i + 2] * (a / 255);
        chunks.push(String.fromCharCode(r));
        chunks.push(String.fromCharCode(g));
        chunks.push(String.fromCharCode(b));
        chunks.push(String.fromCharCode(a));
    }
    return chunks.join("");
}


export function convertImages(panel: HTMLDivElement, file: File, offsets: Offsets, page_size: PageSize, zoom_level: number) {
    LOG.info("Converting images");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const converted_images: StrokeComponent[] = [];
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
            const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
            src = btoa(pack(raw.data));
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        const data = src.replace(IMAGE_BASE64_REGEXP, "");

        const real_x = round3(x || ((image_boundaries.x - offsets.x) / zoom_level));
        const real_y = round3(y || ((image_boundaries.y - offsets.y) / zoom_level));

        const width = round3(canvas.width);
        const height = round3(canvas.height);

        const half_width = round3(width / 2);
        const half_height = round3(height / 2);

        const size: Rectangle = {
            cuboid: {
                half_extents: [half_width, half_height],
            },
            transform: {
                affine: [
                    1, 0, 0,
                    0, 1, 0,
                    half_width, half_height, 1
                ]
            }
        }

        const position: Rectangle = {
            cuboid: {
                half_extents: [half_width, half_height],
            },
            transform: {
                affine: [
                    1, 0, 0,
                    0, 1, 0,
                    real_x + half_width, real_y + half_height, 1
                ]
            }
        }
        file.new_chrono("image")
        converted_images.push({
            value: {
                brushstroke: undefined,
                textstroke: undefined,
                bitmapimage: {
                    image: {
                        data: data,
                        rectangle: size,
                        pixel_width: Math.round(width),
                        pixel_height: Math.round(height),
                        memory_format: "R8g8b8a8Premultiplied"
                    },
                    rectangle: position,
                }
            }, version: 1

        })

        // Inelegant solution to export images max_width and max_height by side effect without
        // scanning multiple times all the images
        page_size.width = Math.max(page_size.width, width);
        page_size.height = Math.max(page_size.height, height);
    }
    return converted_images
}
