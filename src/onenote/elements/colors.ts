import {round3} from "../../rnote/utils";


export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    constructor(r: number, g: number, b: number, a: number, dark: boolean = false) {
        if(dark){
            if(r<0.3){
                r = 1 -r;
            }
            if(g<0.3){
                g = 1 -g;
            }
            if(b<0.3){
                b = 1 -b;
            }
        }
        this.r = round3(r);
        this.g = round3(g);
        this.b = round3(b);
        this.a = round3(a);
    }
}
