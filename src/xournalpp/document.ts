import {BackgroundStyle, BackgroundType, Page} from "./page";
import {Color, RGBAColor} from "./utils";
import {DownloadableDocument} from "../models/document";
import {LOG} from "../adapters/converter";
import {sanitizeFileName} from "../adapters/utils";

export class Document implements DownloadableDocument {
    readonly title: string;
    readonly document: XMLDocument;
    private compressedBlob?: Blob = undefined;

    constructor(title: string = "") {
        this.document = document.implementation.createDocument(null, "xournal");
        const instructions = this.document.createProcessingInstruction("xml", "version=\"1.0\" standalone=\"no\"");
        this.document.insertBefore(instructions, this.document.firstChild);
        this.document.children[0]!.setAttribute("creator", "NotExp Extension");
        this.document.children[0]!.setAttribute("fileversion", "4");
        this.title = title;
    }

    addPage(backgroundType: BackgroundType | undefined, color: Color | RGBAColor = Color.White, style: BackgroundStyle = BackgroundStyle.Graph) {
        const page = new Page(this.document, backgroundType, color, style);
        this.document.children[0]!.appendChild(page.element);
        return page;
    }

    async compress(): Promise<void> {
        const serializer = new XMLSerializer();
        const serializedDocument = serializer.serializeToString(this.document);

        // Xournal++ file format is a GZIP archive with an XML file inside. We need to GZIP the XML before
        // exporting it
        const data = new Blob([serializedDocument], {type: "application/xml"});

        // Using browser built-in compression API to generate the GZipped file
        const compressedStream = data.stream().pipeThrough(
            new CompressionStream("gzip")
        );

        const response = new Response(compressedStream);

        // The GZIP file is associated to a phantom Anchor element to be exported
        LOG.info("Exporting file");
        this.compressedBlob = await response.blob();
    }

    async download(){
        if(!this.compressedBlob){
            await this.compress();
        }
        const pom = document.createElement("a");
        pom.setAttribute('href', URL.createObjectURL(this.compressedBlob!));
        LOG.success("File exported successfully");

        if (!pom) {
            LOG.error("No file converted. Cannot download.");
            return;
        }
        pom.setAttribute('download', `${sanitizeFileName(this.title)}.xopp`);
        pom.click();
    }
}

