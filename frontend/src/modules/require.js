import * as electron from "./electron";
import * as Https from "./https";
import * as Path from "./path";
import * as vm from "./vm";
import * as Webpack from "./webpack";
import fs from "./fs";
import DiscordModules from "./discordmodules";
import Events from "./events";
import mimeTypes from "./mime-types";
import Module from "./module";
import process from "./process";
import RequestModule from "./request";

export default function require(mod) {
    switch (mod) {
        case "_discordmodules":
            return DiscordModules;

        case "_webpack":
            return Webpack;

        case "buffer":
            return DiscordModules.Buffer;

        case "child_process":
            return;

        case "electron":
            return electron;

        case "events":
            return Events;

        case "fs":
        case "original-fs":
            return fs;

        case "http":
        case "https":
            return Https;

        case "mime-types":
            return mimeTypes;

        case "module":
            return Module;

        case "path":
            return Path;

        case "process":
            return process;

        case "request":
            return RequestModule;

        case "url":
            return {
                parse: (urlString) => {
                    return new URL(urlString);
                }
            };

        case "vm":
            return vm;

        default:
            return Module._require(mod, require);
    }
}

require.cache = {};
require.resolve = (path) => {
    for (const key of Object.keys(require.cache)) {
        if (key.startsWith(path))
            return require.cache[key];
    }
};
