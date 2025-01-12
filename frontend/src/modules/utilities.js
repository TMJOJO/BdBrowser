import Buffer from "./buffer";

export default class Utilities {
    /**
     * Converts an {@link ArrayBuffer} to a base64 string.
     * @param {ArrayBuffer} buffer - The ArrayBuffer to be converted into a base64 string.
     * @returns {string} The base64 string representation of the ArrayBuffer's data.
     */
    static arrayBufferToBase64(buffer) {
        let buf = Buffer.from(buffer);
        return buf.toString("base64");
    }

    /**
     * Converts a base64 string to an {@link ArrayBuffer}.
     * @param {string} b64String - The base64 string that is to be converted.
     * @returns {Uint8Array} An Uint8Array representation of the data contained within the b64String.
     */
    static base64ToArrayBuffer(b64String) {
        let buf = Buffer.from(b64String, "base64");
        return new Uint8Array(buf);
    }
}
