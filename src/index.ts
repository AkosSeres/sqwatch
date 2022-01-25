import { DocumentStylerPlugin } from './plugins/document_styler';
import SqWatchApp from './sq_watch';

const app = new SqWatchApp();
app.loadPlugin(DocumentStylerPlugin);