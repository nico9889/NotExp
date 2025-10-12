import {ConvertMessage} from "../messages/convert";
import {DownloadableDocument} from "../models/document";
import {ProgressTracker} from "./progress";

export abstract class OneNoteAdapter {
    readonly progressTracker: ProgressTracker;
    protected constructor(protected options: ConvertMessage, protected panel: HTMLDivElement, conversion_steps: number) {
        this.progressTracker = new ProgressTracker(conversion_steps);
    }
    abstract export(): Promise<DownloadableDocument>;
}