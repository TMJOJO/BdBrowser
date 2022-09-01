import DOM from "common/dom";
import ipcRenderer from "ipcRenderer";
import fs from "./fs";

ipcRenderer.initialize();
export {ipcRenderer};

export const remote = {
    app: {
        getAppPath: () => "ElectronAppPath"
    },
    getCurrentWindow: () => null,
    getCurrentWebContents: () => ({
        on: () => {
        }
    })
};

export const shell = {
    openItem: item => {
        const inputEl = DOM.createElement("input", {type: "file", multiple: "multiple"});
        inputEl.addEventListener("change", () => {
            for (const file of inputEl.files) {
                const reader = new FileReader();
                reader.onload = () => {
                    fs.writeFileSync(`AppData/BetterDiscord/${item.split("/").pop()}/${file.name}`, reader.result);
                };
                reader.readAsText(file);
            }
        });
        inputEl.click();
    },
    openExternal: () => {
    }
}

export const clipboard = {
    writeText: text => navigator.clipboard.writeText(text),
    write: data => {
        if(typeof(data) != "object")
            return;
        if(data.text)
            return navigator.clipboard.writeText(data.text);
        if(data.html)
            return navigator.clipboard.writeText(data.html);
        if(data.rtf)
            return navigator.clipboard.writeText(data.rtf);
    },
}
