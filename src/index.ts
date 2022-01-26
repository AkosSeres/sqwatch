import { DocumentStylerPlugin } from './plugins/document_styler';
import { GroundPlugin } from './plugins/ground';
import { LightingPlugin } from './plugins/lighting';
import { SqInspectorPlugin } from './plugins/sq_inspector';
import SqWatchApp from './sq_watch';

const app = new SqWatchApp();
app.loadPlugin(DocumentStylerPlugin);
app.loadPlugin(LightingPlugin);
app.loadPlugin(GroundPlugin);
app.loadPlugin(SqInspectorPlugin);