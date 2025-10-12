export interface DownloadableDocument {
    download(): Promise<void>;
}