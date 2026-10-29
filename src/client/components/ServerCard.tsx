import { useSyncExternalStore } from 'react';
import { NamedIcon } from '@pterodactyl/sdk';
import { View, type ServerCardState, type ServerStatMetric as ServerCardMetric, type ViewProps } from '@pterodactyl/sdk/theme';
import { dashboardMode, onLayoutChange } from '../runtime';

type Tone = 'success' | 'warning' | 'danger' | 'muted';

const POWER: Record<string, [label: string, tone: Tone]> = {
    running: ['Running', 'success'],
    starting: ['Starting', 'warning'],
    stopping: ['Stopping', 'warning'],
    stopped: ['Stopped', 'danger'],
    offline: ['Offline', 'danger'],
};

const UNAVAILABLE: Record<string, string> = {
    suspended: 'Suspended',
    'connection-error': 'Connection error',
    maintenance: 'Node maintenance',
    transferring: 'Transferring',
    installing: 'Installing',
    'restoring-backup': 'Restoring backup',
    unavailable: 'Unavailable',
};

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ['KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value >= 100 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function status(state: ServerCardState): [label: string, tone: Tone] {
    if (state.kind === 'loading') return ['Loading', 'muted'];
    if (state.kind === 'unavailable') return [UNAVAILABLE[state.reason] ?? 'Unavailable', state.reason === 'suspended' ? 'danger' : 'warning'];
    return POWER[state.power] ?? ['Unknown', 'muted'];
}

function Metric({ label, icon, metric, format }: { label: string; icon: string; metric: ServerCardMetric; format: (n: number) => string }) {
    const unlimited = metric.limit === 0;
    const percent = unlimited ? null : Math.min(100, Math.max(0, (metric.value / metric.limit) * 100));

    return (
        <div className={'ct-metric'} data-alarm={metric.alarm ? '' : undefined}>
            <div className={'ct-metric-head'}>
                <span className={'ct-metric-label'}>
                    <NamedIcon name={icon} className={'ct-metric-icon'} />
                    {label}
                </span>
                <span>
                    <span className={'ct-metric-value'}>{format(metric.value)}</span>
                    <span className={'ct-metric-limit'}> / {unlimited ? '∞' : format(metric.limit)}</span>
                </span>
            </div>
            <div className={'ct-bar'} role={'presentation'}>
                <span style={{ width: `${percent ?? 0}%` }} />
            </div>
        </div>
    );
}

/**
 * The Carbon server card for the dashboard. It renders inside the Panel's own link, so it
 * has no interactive elements. Rows and cards share this markup; the layout comes from
 * <html data-ct-dashboard>, set from the theme stylesheet.
 */
export default function ServerCard({ model, server, className, Default }: ViewProps<'dashboard.serverCard'>) {
    const mode = useSyncExternalStore(onLayoutChange, dashboardMode, () => 'rows');
    if (mode === 'panel') return <Default />;

    const [label, tone] = status(model.state);
    const { state } = model;

    return (
        <div className={className ? `ct-card ${className}` : 'ct-card'} data-tone={tone}>
            <div className={'ct-card-main'}>
                {/* The native identity view keeps the dashboard.serverRow.name.after slot. */}
                <View name={'dashboard.serverCard.identity'} model={model} server={server} />
                <span className={'ct-status'} data-tone={tone}>
                    <i aria-hidden />
                    {label}
                </span>
            </div>
            <div className={'ct-card-meta'}>
                {model.address && (
                    <span className={'ct-chip'}>
                        <NamedIcon name={'ethernet-port'} className={'ct-metric-icon'} />
                        {model.address}
                    </span>
                )}
            </div>
            <div className={'ct-metrics'}>
                {state.kind === 'ready' ? (
                    <>
                        <Metric label={'CPU'} icon={'cpu'} metric={state.cpu} format={(n) => `${n.toFixed(n >= 100 ? 0 : 1)}%`} />
                        <Metric label={'Memory'} icon={'memory-stick'} metric={state.memory} format={formatBytes} />
                        <Metric label={'Disk'} icon={'hard-drive'} metric={state.disk} format={formatBytes} />
                    </>
                ) : (
                    state.kind === 'loading' && <span className={'ct-metrics-loading'} aria-label={'Loading usage'} />
                )}
            </div>
        </div>
    );
}
