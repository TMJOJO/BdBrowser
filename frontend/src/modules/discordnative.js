import process from "./process";

export const app = {
    getReleaseChannel() {
        return globals.releaseChannel;
    },

    getVersion() {
        return "1.0.9005"
    },

    async getPath(path) {
        switch (path) {
            case "appData":
                return process.env.APPDATA;

            default:
                throw new Error("Cannot find path: " + path);
        }
    }
};

export const globals = {
    get releaseChannel() {
        if (location.href.includes("canary"))
            return "canary";

        if (location.href.includes("ptb"))
            return "ptb";

        return "stable";
    }
}
