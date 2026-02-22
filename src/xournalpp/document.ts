export class Document {
    readonly title: string;
    readonly document: XMLDocument;

    constructor(title: string = "") {
        this.document = document.implementation.createDocument(null, "xournal");
        const instructions = this.document.createProcessingInstruction("xml", "version=\"1.0\" standalone=\"no\"");
        this.document.insertBefore(instructions, this.document.firstChild);
        this.document.children[0]!.setAttribute("creator", "NotExp Extension");
        this.document.children[0]!.setAttribute("fileversion", "4");
        this.title = title;
    }

    xmlOpen(){
        return `<?xml version="1.0" standalone="no"?>${this.document.documentElement.outerHTML.slice(0, -2) }>`
    }

    xmlClose(){
        return `</${this.document.documentElement.localName}>`
    }
}

