import {IPCEvents} from "common/constants";
import Logger from "common/logger";
import {default as Asar} from "./asar";
import BdAsarUpdater from "./bdAsarUpdater";
import bdPreload from "./bdPreload";
import Buffer from "./buffer"
import DiscordModules from "./discordmodules";
import DiscordNative from "./discordnative";
import {default as fetchAPI} from "./fetch";
import ipcRenderer from "./ipc";
import process from "./process";
import require from "./require";
import runtimeInfo from "./runtimeInfo";
import RuntimeOptions from "./runtimeOptions";

let allowRequireOverride = false;
let bdPreloadHasInitialized = false;
let requireFunc;

/**
 * Checks for the existence of a BetterDiscord asar file in the VFS.
 * If the file is not present, the function will attempt to download
 * the latest version from BetterDiscord's GitHub releases page.
 * @returns {Promise<boolean>} - Success or failure
 */
async function checkAndDownloadBetterDiscordAsar() {
    await RuntimeOptions.checkAndPerformBetterDiscordAsarRemoval();

    if (BdAsarUpdater.hasBetterDiscordAsarInVfs)
        return true;

    Logger.log("Frontend", "No BetterDiscord asar present in VFS, will try to download a copy...");
    const versionCheckData = await BdAsarUpdater.getCurrentBdVersionInfo();
    const updateWasSuccess = await BdAsarUpdater.downloadBetterDiscordAsar(versionCheckData.data, versionCheckData.remoteVersion);

    Logger.info("Frontend", `Asar update reports ${updateWasSuccess ? "success" : "failure"}.`);
    return updateWasSuccess;
}

/**
 * Decides where to load the BetterDiscord renderer from
 * and returns a string containing the script body.
 * @returns {Promise<string>} scriptBody - A string containing the BetterDiscord renderer source to eval.
 */
async function getBdRendererScript() {

    /**
     * Attempts to get the contents of a web_accessible_resource of the extension.
     * @param url
     * @returns {Promise<undefined|ArrayBuffer>}
     */
    const tryGetLocalFile = async (url) => {
        const localRendererUrl = await ipcRenderer.sendAwait(IPCEvents.GET_RESOURCE_URL, {url: url});
        return await ipcRenderer.sendAwait(IPCEvents.MAKE_REQUESTS, {url: localRendererUrl});
    }

    /**
     * Tries to load the betterdiscord.js from the ./dist folder.
     * @returns {Promise<undefined|ArrayBuffer>}
     */
    const tryGetLocalBetterDiscordJs = async () => {
        const localFileContents = await tryGetLocalFile("dist/betterdiscord.js");
        if(!localFileContents)
            return;

        Logger.info("Frontend", "Reading betterdiscord.js from local extension folder...");
        runtimeInfo.setBdRendererSource("betterdiscord.js", true);
        return localFileContents.body;
    }

    /**
     * Tries to load the betterdiscord.asar from the ./dist folder.
     * @returns {Promise<undefined|ArrayBuffer>}
     */
    const tryGetLocalBetterDiscordAsar = async () => {
        const localFileContents = await tryGetLocalFile("dist/betterdiscord.asar");
        if(!localFileContents)
            return;

        Logger.info("Frontend", "Reading betterdiscord.asar from local extension folder...");
        runtimeInfo.setBdRendererSource("betterdiscord.asar", true);
        return new Asar(localFileContents.body).get("renderer.js");
    }

    /**
     * Tries to load the betterdiscord.asar from the VFS.
     * @returns {undefined|ArrayBuffer}
     */
    const tryGetVfsBetterDiscordAsar = () => {
        Logger.info("Frontend", "Reading betterdiscord.asar in the VFS...");
        runtimeInfo.setBdRendererSource("betterdiscord.asar", false);
        return new Asar(BdAsarUpdater.asarFile.buffer).get("renderer.js");
    }

    /**
     * Gets the BetterDiscord renderer script body.
     * @returns {Promise<undefined|ArrayBuffer>}
     */
    const getRenderer = async () => {
        return await tryGetLocalBetterDiscordJs() || await tryGetLocalBetterDiscordAsar() || tryGetVfsBetterDiscordAsar();
    }

    const bdBodyBuffer = await getRenderer();
    return new TextDecoder().decode(bdBodyBuffer);
}

/**
 * Loads and injects the BetterDiscord renderer into the page context.
 * Also initializes any BdBrowser-specific DOM modifications.
 * @returns {Promise<boolean>}
 */
async function loadBetterDiscord() {
    const connectionOpenEvent = "CONNECTION_OPEN";

    const bdScriptBody = await getBdRendererScript();

    if(!bdScriptBody)
        return false;

    runtimeInfo.parseBetterDiscordVersion(bdScriptBody);

    const callback = async () => {
        DiscordModules.Dispatcher.unsubscribe(connectionOpenEvent, callback);
        try {
            Logger.log("Frontend", "Loading BetterDiscord renderer...");
            eval(`(() => {
                    ${bdScriptBody}
                })(window.fetchWithoutCSP)`);
        } catch (error) {
            Logger.error("Frontend", "Failed to load BetterDiscord:\n", error);
        }
    };

    runtimeInfo.addExtensionVersionInfo();

    // Disable all plugins if the user has requested it.
    await RuntimeOptions.disableAllBetterDiscordPlugins();

    if (!RuntimeOptions.shouldStartBetterDiscordRenderer) {
        Logger.log("Frontend", "BetterDiscord renderer disabled by user.");
        return true;
    }

    if (!DiscordModules.UserStore?.getCurrentUser()) {
        Logger.log("Frontend", "getCurrentUser failed, registering callback.");
        DiscordModules.Dispatcher.subscribe(connectionOpenEvent, callback);
    } else {
        Logger.log("Frontend", "getCurrentUser succeeded, running setImmediate().");
        setImmediate(callback);
    }

    return true;
}

/**
 * Prepares global window objects.
 */
function prepareWindow() {
    requireFunc = require.bind({});
    window.require = requireFunc;

    window.Buffer = Buffer;
    window.DiscordNative = DiscordNative;
    window.fetchWithoutCSP = fetchAPI;
    window.global = window;
    window.process = process;

    // Provide self-immolating BetterDiscord preload.
    window.BetterDiscordPreload = () => {
        if (bdPreloadHasInitialized) return null;
        bdPreloadHasInitialized = true;
        return bdPreload;
    };

    // Prevent warnings for non-existing properties during Webpack search in "nativeModules".
    Object.defineProperty(DiscordModules.ElectronModule, "canBootstrapNewUpdater", {
        value: false,
        configurable: true
    });

    // Prevent the _very first_ override of window.require by BetterDiscord to
    // keep BdBrowser's own version intact. However, allow later changes to it
    // (i.e. for Monaco).
    Object.defineProperty(window, "require", {
        get() {
            return requireFunc;
        },
        set(newValue) {
            if (!allowRequireOverride) return (allowRequireOverride = true);
            requireFunc = newValue;
        }
    });
}

export default {
    checkAndDownloadBetterDiscordAsar,
    loadBetterDiscord,
    prepareWindow
}
