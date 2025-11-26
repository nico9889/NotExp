import {DownloadableDocument} from "../models/document";
import {LOG} from "../adapters/converter";
import {sanitizeFileName} from "../adapters/utils";
import {FileContent} from "./document";
import {Colors, RGB} from "./utils";
import {ChronoComponent} from "./chrono";

export class File implements DownloadableDocument {
    readonly title: string;
    private compressedBlob?: Blob = undefined;
    private readonly document: FileContent;
    private stroke_components: string = "";

    constructor(title: string = "") {
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
        const serializedDocument = JSON.stringify(this.document)
            .replace('"stroke_components":[]', `"stroke_components":[${this.stroke_components}]`);;
        // RNote++ file format is a GZIP archive with an XML file inside. We need to GZIP the XML before
        // exporting it
        const data = new Blob([serializedDocument], {type: "application/json"});

        // Using browser built-in compression API to generate the GZipped file
        const compressedStream = data.stream().pipeThrough(
            new CompressionStream("gzip")
        );

        const response = new Response(compressedStream);

        // The GZIP file is associated to a phantom Anchor element to be exported
        LOG.info("Exporting file");
        this.compressedBlob = await response.blob();
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

    replace_strokes(converted_strokes: string[]) {
        this.stroke_components = converted_strokes.join(",");
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