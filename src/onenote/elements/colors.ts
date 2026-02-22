import {round3} from "../../rnote/utils";


export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    constructor(r: number, g: number, b: number, a: number) {
        this.r = round3(r);
        this.g = round3(g);
        this.b = round3(b);
        this.a = round3(a);
    }

    fromHex(hex: string) {

    }
}
