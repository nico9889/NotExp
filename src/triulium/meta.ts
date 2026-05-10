
export interface Attribute{

}

export interface Attachment{
    attachmentId: string,
    title: string,
    role: "image";
    mime: string,
    position: number,
    dataFileName: string
}

export interface File{
    noteId?: string,
    notePath?: string[],
    isClone?: boolean,
    title?: string,
    notePosition?: number,
    prefix?: string | null,
    isExpanded?: boolean,
    type?: string,
    mime?: string,
    dataFileName: string,
    noImport: boolean,
    attributes?: Attribute[],
    attachments?: Attachment[]
}


export interface Meta{
    formatVersion: number;
    appVersion: string;
    files: File[]
}