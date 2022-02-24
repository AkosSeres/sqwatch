import { SqPlugin } from "./sq_plugin"

/**
 * This plugin removes the unnecessary margins of the document.
 */
export const DocumentStylerPlugin: SqPlugin = {
    /**
     * Removes the unnecessary margins and sets the background color to black.
     * @return {void}
     */
    init: () => {
        document.body.style.margin = '0px';
        document.body.style.backgroundColor = 'black';
        document.title = "SqWatch";
    }
}