import browser from "webextension-polyfill";
import {ProgressMessage, Status} from "../messages/convert";

export class ProgressTracker {
    private currentStep = 0;

    constructor(private readonly steps: number = 1) {
        if (this.steps <= 0) {
            this.steps = 1;
        }
    }

    async reset() {
        this.currentStep = 0;
        await this.updateProgressBar(Status.Ok);
    }

    private async updateProgressBar(status: Status) {
        const message: ProgressMessage = {
            message: "progress",
            progress: Math.min(Math.round((this.currentStep / this.steps) * 100), 100),
            status: status
        };
        await browser.runtime.sendMessage({text:JSON.stringify(message)});
    }

    async bump() {
        this.currentStep += 1;
        await this.updateProgressBar(Status.Ok);
    }

    async error() {
        if(this.currentStep === 0){
            this.currentStep = this.steps;
        }
        await this.updateProgressBar(Status.Error);
    }
}
