import './styles.css';
import { definePterodactylExtension } from '@pterodactyl/sdk';
import { start } from './runtime';
import AuthHead from './components/AuthHead';
import ConsoleStatus from './components/ConsoleStatus';

export default definePterodactylExtension({
    setup({ screens, components, slots }) {
        const serverCard = () => import('./components/ServerCard');
        const fileManager = () => import('./components/FileManager');
        const fileDetails = () => import('./components/FileDetails');
        // Loaded up front so the Panel is shown with them already in place.
        start([serverCard(), fileManager(), fileDetails()]);

        screens.register('settings', () => import('./screens/ThemeScreen'));
        components.replace('dashboard.serverCard', { load: serverCard });
        components.replace('server.files.manager', { load: fileManager });
        components.replace('server.files.details', { load: fileDetails });
        slots.register('server.console.power.before', ConsoleStatus);
        for (const slot of ['auth.login.before', 'auth.checkpoint.before', 'auth.password.before', 'auth.passwordReset.before'] as const) {
            slots.register(slot, AuthHead);
        }
    },
});
