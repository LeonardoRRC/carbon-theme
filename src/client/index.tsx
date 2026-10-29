import { defineTheme, lazyView } from '@pterodactyl/sdk/theme';
import { start } from './runtime';
import AuthHead from './components/AuthHead';
import ConsoleStatus from './components/ConsoleStatus';

const serverCard = () => import('./components/ServerCard');
const fileManager = () => import('./components/FileManager');
const fileDetails = () => import('./components/FileDetails');
const consoleBlocks = () => import('./components/ConsoleBlocks');

/**
 * Carbon on the Panel's theme API: the server card and the file manager are view layers over
 * classic (each falls back to classic's own view when its style is "panel"), and the editor,
 * the console status, and the sign-in heading are registered as an extension's would be.
 */
export default defineTheme({
    views: {
        'dashboard.serverCard': lazyView(serverCard),
        'server.files.manager': lazyView(fileManager),
        'server.files.details': lazyView(fileDetails),
        // The Blocks console design; the other designs keep the layer below.
        'page.server.console': lazyView(consoleBlocks),
        'server.stats': lazyView(consoleBlocks, 'StatBlocks'),
    },
    setup({ screens, slots }) {
        // Loaded up front so the Panel is shown with them already in place.
        start([serverCard(), fileManager(), fileDetails(), consoleBlocks()]);

        screens.register('settings', () => import('./screens/ThemeScreen'));
        slots.register('server.console.power.before', ConsoleStatus);
        for (const slot of ['auth.login.before', 'auth.checkpoint.before', 'auth.password.before', 'auth.passwordReset.before'] as const) {
            slots.register(slot, AuthHead);
        }
    },
});
