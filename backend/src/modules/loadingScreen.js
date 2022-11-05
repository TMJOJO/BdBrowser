export default class LoadingScreen {
    static #_LOADING_ANIMATION_SELECTOR = `video[data-testid="app-spinner"]`;

    static #_loadingObserver = new MutationObserver(mutations => {
        if (document.readyState === "complete")
            this.#_loadingObserver.disconnect();

        let loadingAnimationElement = document.querySelector(this.#_LOADING_ANIMATION_SELECTOR);
        if (loadingAnimationElement) {
            this.#_loadingObserver.disconnect();

            // Should be a WebM file with VP9 codec (400px x 400px) so the alpha channel gets preserved.
            let customAnimationSource = document.createElement("source");
            customAnimationSource.src = chrome.runtime.getURL("assets/spinner.webm");
            customAnimationSource.type = "video/webm";

            loadingAnimationElement.prepend(customAnimationSource);
        }
    });

    /**
     * Inserts the custom loading screen spinner animation from
     * `assets/spinner.webm` into the playlist.
     *
     * If the file cannot be found, the video player will automatically
     * choose one of the default Discord animations.
     */
    static ReplaceLoadingAnimation() {
        this.#_loadingObserver.observe(document, {
            childList: true,
            subtree: true
        });
    }
}
