import { useState, useSyncExternalStore } from 'react';
import { SocketEvent, useServerWebsocketEvent } from '@pterodactyl/sdk';
import { consoleStyle, onLayoutChange } from '../runtime';

const STATES: Record<string, [label: string, tone: 'success' | 'warning' | 'danger' | 'muted']> = {
    running: ['Running', 'success'],
    starting: ['Starting', 'warning'],
    stopping: ['Stopping', 'warning'],
    offline: ['Offline', 'danger'],
};

/** "3d 4h", "2h 15m", "4m 10s". */
export function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds % 60}s`;
}

/**
 * The server's live power state above the power buttons, in the Carbon console style.
 * Wings reports it in "status" events and in every "stats" event, which also carries uptime.
 */
export default function ConsoleStatus() {
    const style = useSyncExternalStore(onLayoutChange, consoleStyle, () => 'panel');
    const [state, setState] = useState<string | null>(null);
    const [uptime, setUptime] = useState(0);

    useServerWebsocketEvent(SocketEvent.STATUS, (status) => setState(status));
    useServerWebsocketEvent(SocketEvent.STATS, (raw) => {
        try {
            const stats = JSON.parse(raw) as { state?: string; uptime?: number };
            if (stats.state) setState(stats.state);
            setUptime(stats.uptime ?? 0);
        } catch {
            // A malformed stats message changes nothing.
        }
    });

    if (style !== 'carbon') return null;

    const [label, tone] = state ? (STATES[state] ?? [state, 'muted']) : ['Connecting', 'muted'];

    return (
        <div className={'ct-console-status'}>
            <span className={'ct-status'} data-tone={tone}>
                <i aria-hidden />
                {label}
                {state === 'running' && uptime > 0 && <span className={'ct-console-uptime'}>· {formatUptime(uptime)}</span>}
            </span>
        </div>
    );
}
