import {round3} from "../../rnote/utils";


export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;

    constructor(r: number, g: number, b: number, a: number, dark: boolean = false) {
        if(r > 1){
            r /= 255;
        }
        if(g > 1){
            g /= 255;
        }
        if(b > 1){
            b /= 255;
        }
        if(r > 1 || g > 1 || b > 1){
            console.warn(`Color out of valid range (${r},${g},${b}). Attempting to normalize it.`);
            const max = Math.max(r, g, b);
            r /= max;
            g /= max;
            b /= max;
        }
        if(dark){
            if(r<0.3 && g < 0.3 && b < 0.3){
                // Invert a channel only if it's too dark, but still relevant
                if(r > 0.1 && r < 0.3) r = 1 -r;
                if(g > 0.1 && g < 0.3) g = 1 -g;
                if(b > 0.1 && b < 0.3) b = 1 -b;

                // If all the channels are still dark, then invert them all
                if(r<0.3 && g < 0.3 && b < 0.3){
                    r = 1-r;
                    g = 1-g;
                    b = 1-b;
                }
            }
        }
        this.r = round3(r);
        this.g = round3(g);
        this.b = round3(b);
        this.a = round3(a);
    }
}
