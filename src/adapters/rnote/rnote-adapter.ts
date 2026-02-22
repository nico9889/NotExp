import {OneNote} from "../../onenote/onenote";
import {FileContent} from "../../rnote/document";
import {Colors, round3} from "../../rnote/utils";
import {LOG} from "../converter";
import {Segment, StrokeComponent} from "../../rnote/stroke";
import {ChronoComponent} from "../../rnote/chrono";
import {ProgressTracker} from "../progress";

export interface Offsets {
    x: number,
    y: number
}

function updateChrono(rnote: FileContent, layer: number | null | "image" | "highlighter" = 0): ChronoComponent {
    let chrono: ChronoComponent;
    if (layer === null) {
        chrono = {
            value: null, version: 0
        }
    } else if (layer === "image" || layer === "highlighter") {
        chrono = {
            value: {
                t: ++rnote.data.engine_snapshot.chrono_counter,
                layer: layer
            },
            version: 1
        }
    } else {
        chrono = {
            value: {
                t: ++rnote.data.engine_snapshot.chrono_counter,
                layer: {
                    user_layer: layer
                }
            },
            version: 1
        }
    }

    rnote.data.engine_snapshot.chrono_components.push(chrono);
    return chrono;
}

async function writeImages(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const image of onenote.getImages()) {
        const half_width = round3(image.width / 2);
        const half_height = round3(image.height / 2);

        const stroke_component: StrokeComponent = {
            value: {
                brushstroke: undefined,
                textstroke: undefined,
                bitmapimage: {
                    image: {
                        data: await image.asEncodedR8G8B8A8Premultiplied(),
                        memory_format: "R8g8b8a8Premultiplied",
                        pixel_height: image.height,
                        pixel_width: image.width,
                        rectangle: {
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
                    }, rectangle: {
                        cuboid: {
                            half_extents: [half_width, half_height],
                        },
                        transform: {
                            affine: [
                                1, 0, 0,
                                0, 1, 0,
                                image.x + half_width, image.y + half_height, 1
                            ]
                        }
                    }
                }
            },
            version: 1
        }
        updateChrono(rnote, "image");
        await writer.write(encoder.encode(','));
        const output = JSON.stringify(stroke_component);
        await writer.write(encoder.encode(output));
        exported += 1;
    }
    return exported;
}


async function writeMath(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const math of onenote.getMath()) {
        const width = await math.width();
        const height = await math.height();

        const half_width = round3(width / 2);
        const half_height = round3(height / 2);

        const stroke_component: StrokeComponent = {
            value: {
                brushstroke: undefined,
                textstroke: undefined,
                bitmapimage: {
                    image: {
                        data: await math.asEncodedR8G8B8A8Premultiplied(),
                        memory_format: "R8g8b8a8Premultiplied",
                        pixel_height: await math.finalHeight(),
                        pixel_width: await math.finalWidth(),
                        rectangle: {
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
                    }, rectangle: {
                        cuboid: {
                            half_extents: [half_width, half_height],
                        },
                        transform: {
                            affine: [
                                1, 0, 0,
                                0, 1, 0,
                                math.x + half_width, math.y + half_height, 1
                            ]
                        }
                    }
                }
            },
            version: 1
        }
        updateChrono(rnote, "image");
        await writer.write(encoder.encode(','));
        const output = JSON.stringify(stroke_component);
        await writer.write(encoder.encode(output));
        exported += 1;
    }
    return exported;
}

async function writeStrokes(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;
    for (const stroke of onenote.getStrokes()) {

        const points_generator = stroke.points();
        const start = points_generator.next().value;
        const segments: Segment[] = [];
        for (const point of points_generator) {
            segments.push({
                lineto: {
                    end: {
                        pos: point,
                        pressure: 1
                    }
                }
            });
        }

        const color = {
            r: stroke.color.r, g: stroke.color.g, b: stroke.color.b, a: stroke.color.a
        }

        const stroke_component: StrokeComponent = {
            value: {
                bitmapimage: undefined,
                textstroke: undefined,
                brushstroke: {
                    path: {
                        start: {
                            pos: start,
                            pressure: 1
                        },
                        segments
                    },
                    style: {
                        smooth: {
                            stroke_width: stroke.width,
                            stroke_color: color,
                            fill_color: color,
                            pressure_curve: "linear",
                            line_style: "solid",
                            line_cap: "straight"
                        }
                    }
                }
            },
            version: 1,
        }

        updateChrono(rnote, (stroke.color.a < 1) ? "highlighter" : 0);
        await writer.write(encoder.encode(','));
        const output = JSON.stringify(stroke_component);
        await writer.write(encoder.encode(output));
        exported += 1;
    }
    return exported;
}

async function writeTexts(rnote: FileContent, onenote: OneNote, writer: WritableStreamDefaultWriter<BufferSource>, encoder: TextEncoder): Promise<number> {
    let exported = 0;

    for (const paragraph of onenote.getParagraphs()) {
        for (const text of paragraph.getTexts()) {
            for (const chunk of text.chunks()) {
                const stroke_component: StrokeComponent = {
                    value: {
                        brushstroke: undefined,
                        textstroke: {
                            text: chunk.line,
                            text_style: {
                                // The quote replacement is necessary only in Chrome
                                font_family: text.font,
                                font_size: text.fontSize,
                                font_weight: 100,
                                font_style: "regular",
                                color: text.color,
                                // FIXME: for some reason the text box isn't large enough, probably this happens because
                                //   of font incompatibility.
                                //   The * 1.23 is arbitrary and has been added as a workaround and it should be removed
                                //   in the future.
                                max_width: round3(chunk.width * 1.23),
                                alignment: "start",
                                ranged_text_attributes: []
                            }, transform: {
                                affine: [1, 0, 0, 0, 1, 0, chunk.x, chunk.y - (chunk.height / 2), 1]
                            }
                        },
                        bitmapimage: undefined
                    }, version: 1
                }
                updateChrono(rnote, 0);
                await writer.write(encoder.encode(','));
                const output = JSON.stringify(stroke_component);
                await writer.write(encoder.encode(output));
                exported += 1;
            }
        }
    }
    return exported;
}

export async function convertToRnote(onenote: OneNote, progress: ProgressTracker): Promise<Blob> {
    const rnote: FileContent = {
        data: {
            engine_snapshot: {
                document: {
                    config: {
                        format: {
                            width: onenote.size.width,
                            height: onenote.size.height,
                            dpi: 96,
                            orientation: "portrait",
                            border_color: (onenote.options.dark_page) ? Colors.White : Colors.Black,
                            show_borders: false,
                            show_origin_indicator: false
                        },
                        background: {
                            color: (onenote.options.dark_page) ? Colors.Black : Colors.White,
                            pattern: "dots",
                            pattern_size: [32, 32],
                            pattern_color: (onenote.options.dark_page) ? Colors.White : Colors.Black,
                        },
                        layout: "infinite"
                    },
                    x: 0,
                    y: 0,
                    width: onenote.size.width,
                    height: onenote.size.height
                },
                camera: {
                    offset: [0, 0],
                    size: [640, 480],
                    zoom: 1.0
                },
                stroke_components: [],
                chrono_components: [],
                chrono_counter: 0
            }
        },
        version: "0.13.0"
    }

    updateChrono(rnote, null);

    const output = JSON.stringify(rnote);

    const index = output.indexOf("\"stroke_components\":[]")
    const header = output.substring(0, index);

    const textEncoder = new TextEncoder();
    const cs = new CompressionStream("gzip");


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
    try {
        // Write the file "header" data
        await writer.write(textEncoder.encode(header));

        // Write the stroke components data
        await writer.write(textEncoder.encode('"stroke_components":['));

        writer.write(textEncoder.encode('{"value":null,"version":0}'));

        let exported = 0;
        exported += await writeImages(rnote, onenote, writer, textEncoder);
        await progress.bump();
        exported += await writeTexts(rnote, onenote, writer, textEncoder);
        await progress.bump();
        exported += await writeMath(rnote, onenote, writer, textEncoder);
        await progress.bump();
        exported += await writeStrokes(rnote, onenote, writer, textEncoder);
        await progress.bump();

        LOG.info(`Exported ${exported} elements`);


        // Write the Chrono Components data, this must be write AFTER the Stroke Components, as the field get
        // populated by the iterator
        await writer.write(textEncoder.encode('],"chrono_components":'));
        await writer.write(textEncoder.encode(JSON.stringify(rnote.data.engine_snapshot.chrono_components)))
        await writer.write(textEncoder.encode(',"chrono_counter":'));
        await writer.write(textEncoder.encode(rnote.data.engine_snapshot.chrono_counter.toString()));
        await writer.write(textEncoder.encode('}}'));

        // In the end, write the file version
        await writer.write(textEncoder.encode(',"version":"'));
        await writer.write(textEncoder.encode(rnote.version));
        await writer.write(textEncoder.encode('"}'));
    } finally {
        await writer.close();
    }

    await readerPromise;

    await progress.bump();
    // The GZIP file is associated with a phantom Anchor element to be exported
    LOG.info("Exporting file");
    return new Blob(chunks as any, {type: "application/gzip"});
}