import {Text} from "./text";
import {OneNote} from "../onenote";

export class Paragraph {
    readonly document: OneNote;
    readonly paragraph: HTMLParagraphElement;

    constructor(document: OneNote, paragraph: HTMLParagraphElement) {
        this.document = document;
        this.paragraph = paragraph;
    }

    *getTexts(){
        const texts = this.paragraph.getElementsByClassName("TextRun") as HTMLCollectionOf<HTMLSpanElement>;
        for(const text of texts){
            yield new Text(this.document, text);
        }
    }
}