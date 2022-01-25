import SqWatchApp from '../sq_watch';

export interface SqPlugin {
    init?: (app: SqWatchApp) => void
    update?: (app: SqWatchApp) => void
    [x: string]: unknown;
}
