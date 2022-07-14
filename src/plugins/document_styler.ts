import { SqPlugin } from "./sq_plugin"
import "../styles.css"

/**
 * This plugin removes the unnecessary margins of the document.
 */
export const DocumentStylerPlugin: SqPlugin = {
    /**
     * Removes the unnecessary margins and sets the background color to black.
     * @return {void}
     */
    init: (): void => {
        document.body.style.margin = '0px';
        document.body.style.backgroundColor = 'black';
        document.title = "SqWatch";
    }
}
