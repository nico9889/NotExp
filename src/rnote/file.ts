import {DownloadableDocument} from "../models/document";
import {LOG} from "../adapters/converter";
import {sanitizeFileName} from "../adapters/utils";
import {FileContent} from "./document";
import {Colors, RGB} from "./utils";
import {ChronoComponent} from "./chrono";
import {StrokeComponent} from "./stroke";

export class File implements DownloadableDocument {
    readonly title: string;
    private compressedBlob?: Blob = undefined;
    private readonly document: FileContent;

    constructor(title: string = "", private stroke_generator: () => AsyncIterableIterator<StrokeComponent>) {
        this.title = title;
        this.document = {
            data: {
                engine_snapshot: {
                    document: {
                        config: {
                            format: {
                                width: 0,
                                height: 0,
                                dpi: 96,
                                orientation: "portrait",
                                border_color: Colors.Black,
                                show_borders: false,
                                show_origin_indicator: false
                            },
                            background: {
                                color: Colors.White,
                                pattern: "dots",
                                pattern_size: [32, 32],
                                pattern_color: Colors.Black,
                            },
                            layout: "infinite"
                        },
                        x: 0,
                        y: 0,
                        width: 0,
                        height: 0
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
    }

    async compress(): Promise<void> {
        const document = JSON.stringify(this.document);
        const index = document.indexOf("\"stroke_components\":[]")
        const header = document.substring(0, index);

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



            let first = true;
            for await (const value of this.stroke_generator()) {
                if (!first) await writer.write(textEncoder.encode(','));
                await writer.write(textEncoder.encode(JSON.stringify(value)));
                first = false;
            }

            // Write the Chrono Components data, this must be write AFTER the Stroke Components, as the field get
            // populated by the iterator
            await writer.write(textEncoder.encode('],"chrono_components":'));
            await writer.write(textEncoder.encode(JSON.stringify(this.document.data.engine_snapshot.chrono_components)))
            await writer.write(textEncoder.encode(',"chrono_counter":'));
            await writer.write(textEncoder.encode(this.document.data.engine_snapshot.chrono_counter.toString()));
            await writer.write(textEncoder.encode('}}'));

            // In the end, write the file version
            await writer.write(textEncoder.encode(',"version":"'));
            await writer.write(textEncoder.encode(this.document.version));
            await writer.write(textEncoder.encode('"}'));
        } finally {
            await writer.close();
        }

        await readerPromise;

        // The GZIP file is associated to a phantom Anchor element to be exported
        LOG.info("Exporting file");
        this.compressedBlob = new Blob(chunks as any, {type: "application/gzip"});
    }


    async download() {
        if (!this.compressedBlob) {
            await this.compress();
        }
        const pom = document.createElement("a");
        pom.setAttribute('href', URL.createObjectURL(this.compressedBlob!));
        LOG.success("File exported successfully");

        if (!pom) {
            LOG.error("No file converted. Cannot download.");
            return;
        }
        pom.setAttribute('download', `${sanitizeFileName(this.title)}.rnote`);
        pom.click();
    }

    set_background_color(page_color: RGB) {
        this.document.data.engine_snapshot.document.config.background.color = page_color;
    }

    set_size(width: number, height: number) {
        this.document.data.engine_snapshot.document.height = height;
        this.document.data.engine_snapshot.document.width = width;
        this.document.data.engine_snapshot.document.config.format.height = height;
        this.document.data.engine_snapshot.document.config.format.width = width;
        this.document.data.engine_snapshot.document.width = width;
        this.document.data.engine_snapshot.document.height = height;
    }

    new_chrono(layer: number | null | "image" | "highlighter" = 0): ChronoComponent {
        let chrono: ChronoComponent;
        if (layer === null) {
            chrono = {
                value: null, version: 0
            }
        } else if (layer === "image" || layer === "highlighter") {
            chrono = {
                value: {
                    t: ++this.document.data.engine_snapshot.chrono_counter,
                    layer: layer
                },
                version: 1
            }
        } else {
            chrono = {
                value: {
                    t: ++this.document.data.engine_snapshot.chrono_counter,
                    layer: {
                        user_layer: layer
                    }
                },
                version: 1
            }
        }
        this.document.data.engine_snapshot.chrono_components.push(chrono);
        return chrono;
    }
}