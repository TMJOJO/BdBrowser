import {IPCEvents} from "common/constants";
import DOM from "common/dom";
import ipcRenderer from "common/ipc";
import Logger from "common/logger";

Logger.log("Backend", "Initializing modules");

const ipcMain = new ipcRenderer("backend");

Logger.log("Backend", "Registering events");

ipcMain.on(IPCEvents.INJECT_CSS, (_, data) => {
    DOM.injectCSS(data.id, data.css);
});

ipcMain.on(IPCEvents.INJECT_THEME, (_, data) => {
    DOM.injectTheme(data.id, data.css);
});

ipcMain.on(IPCEvents.MAKE_REQUESTS, (event, data) => {
    fetch(data.url)
        .catch(console.error.bind(null, "REQUEST FAILED:"))
        .then(res => res.text()).then(text => {
        ipcMain.reply(event, text);
    })
});

ipcMain.on(IPCEvents.GET_RESOURCE_URL, (event, data) => {
    ipcMain.reply(event, chrome.runtime.getURL(data.url));
});

const SCRIPT_URL = (() => {
    switch (ENV) {
        case "production":
            return chrome.runtime.getURL("dist/frontend.js");

        case "development":
            return "http://127.0.0.1:5500/frontend.js";

        default:
            throw new Error("Unknown Environment");
    }
})();

Logger.log("Backend", "Loading frontend script from", SCRIPT_URL);

DOM.injectJS("BetterDiscordBrowser-frontend", SCRIPT_URL, false);
