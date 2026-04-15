import browser, {Runtime} from "webextension-polyfill";
import {convertNote} from "./adapters/converter";
import {Message} from "./messages";
import {ConvertMessage} from "./messages/convert";
import MessageSender = Runtime.MessageSender;

/* TODO
interface LogEnableMessage extends Message {
    enable: boolean;
}

interface LogDebugMessage extends Message {
    enable: boolean;
}
 */

browser.runtime.onMessage.addListener(async (request: any, _: MessageSender) => {
    const message = request as (Message);
    if (message.message === 'convert') {
        try {
            await convertNote(message as ConvertMessage);
        } catch (e) {
            console.error(e);
        }
    }else if(message.message === "ping"){
        return {message: "pong"};
    }
    /* TODO
    else if (message.message === 'full_log') {
        log.writeAll();
    } else if (message.message === 'log_enable') {
        const log_enable = message as LogEnableMessage;
        log.enabled = log_enable.enable
    } else if (message.message === 'log_debug') {

        const log_debug = message as LogDebugMessage;
        log.debugEnabled = log_debug.enable;
    }
     */
});
