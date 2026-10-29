import { useSyncExternalStore, type ReactNode } from 'react';
import { Cpu, Fingerprint, HardDrive, MemoryStick, Network, Server } from 'lucide-react';
import { Alert, CopyOnClick, ServerContentBlock, bytesToString, useCurrentServer } from '@pterodactyl/sdk';
import { Slot, View, type ServerConsoleModel, type ServerStatMetric, type ViewProps } from '@pterodactyl/sdk/theme';
import { consoleStyle, onLayoutChange } from '../runtime';
import { formatUptime } from './ConsoleStatus';

const notices: Record<NonNullable<ServerConsoleModel['notice']>, string> = {
    maintenance: 'The node of this server is currently under maintenance and all actions are unavailable.',
    installing: 'This server is currently running its installation process and most actions are unavailable.',
    transferring: 'This server is currently being transferred to another node and all actions are unavailable.',
};

const STATES: Record<string, [label: string, tone: 'success' | 'warning' | 'danger' | 'muted']> = {
    running: ['Running', 'success'],
    starting: ['Starting', 'warning'],
    stopping: ['Stopping', 'warning'],
    offline: ['Offline', 'danger'],
};

function useBlocks(): boolean {
    return useSyncExternalStore(onLayoutChange, consoleStyle, () => 'panel') === 'blocks';
}

/** A titled block: the accent band with an icon and a label, and the value below it. */
function Block({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className={'ct-block'}>
            <p className={'ct-block-head'}>
                {icon}
                {label}
            </p>
            <div className={'ct-block-body'}>{children}</div>
        </div>
    );
}

/** Copies the value when the block is clicked; a block with nothing to copy is a plain block. */
function Copyable({ text, children }: { text: string | null | undefined; children: ReactNode }) {
    if (!text) return <>{children}</>;

    return (
        <CopyOnClick text={text}>
            <div className={'ct-block-copy'}>{children}</div>
        </CopyOnClick>
    );
}

/** "0.00% / 200%", "512 MiB / 1.5 GiB", or the value alone when the limit is unlimited. */
function Usage({ metric, format }: { metric: ServerStatMetric; format: (value: number) => string }) {
    return (
        <span className={'ct-block-usage'} data-alarm={metric.alarm ?? undefined}>
            {format(metric.value)}
            <span className={'ct-block-limit'}> / {metric.limit > 0 ? format(metric.limit) : '∞'}</span>
        </span>
    );
}

/**
 * The server's live values as a row of titled blocks: its status, address, identifier, and usage.
 * Other console designs keep the layer below.
 */
export function StatBlocks({ model, className, Default }: ViewProps<'server.stats'>) {
    const blocks = useBlocks();
    const identifier = useCurrentServer((server) => server.attributes.identifier);
    if (!blocks) return <Default />;

    const [label, tone] = model.state ? (STATES[model.state] ?? [model.state, 'muted']) : ['Connecting', 'warning'];
    const offline = model.state === null || model.state === 'offline';
    const percent = (value: number) => `${value.toFixed(2)}%`;

    return (
        <div className={className ? `ct-blocks ${className}` : 'ct-blocks'}>
            <Block icon={<Server aria-hidden />} label={'Status'}>
                <span className={'ct-block-status'} data-tone={tone}>
                    <i aria-hidden />
                    {label}
                    {model.state === 'running' && model.uptime > 0 && (
                        <span className={'ct-block-limit'}> · {formatUptime(model.uptime)}</span>
                    )}
                </span>
            </Block>
            <Copyable text={model.address}>
                <Block icon={<Network aria-hidden />} label={'IP Address'}>
                    <span className={'ct-block-mono'}>{model.address ?? 'n/a'}</span>
                </Block>
            </Copyable>
            <Copyable text={identifier}>
                <Block icon={<Fingerprint aria-hidden />} label={'Server ID'}>
                    <span className={'ct-block-mono'}>{identifier?.toUpperCase() ?? 'n/a'}</span>
                </Block>
            </Copyable>
            <Block icon={<Cpu aria-hidden />} label={'CPU'}>
                {offline ? <span className={'ct-block-limit'}>Offline</span> : <Usage metric={model.cpu} format={percent} />}
            </Block>
            <Block icon={<MemoryStick aria-hidden />} label={'RAM'}>
                {offline ? <span className={'ct-block-limit'}>Offline</span> : <Usage metric={model.memory} format={bytesToString} />}
            </Block>
            <Block icon={<HardDrive aria-hidden />} label={'Storage'}>
                <Usage metric={model.disk} format={bytesToString} />
            </Block>
        </div>
    );
}

/**
 * The Blocks console: the server's name and power controls, the stat blocks, a full-width terminal,
 * and the charts under titled bands. It keeps every slot and prompt of the Panel's console page.
 */
export default function ConsoleBlocks({ model, active, className, Default }: ViewProps<'page.server.console'>) {
    const blocks = useBlocks();
    if (!blocks) return <Default />;

    return (
        <ServerContentBlock title={active ? 'Console' : undefined} className={className}>
            <div className={'ct-blocks-page'}>
                {model.notice && <Alert type={'warning'}>{notices[model.notice]}</Alert>}
                <Slot name={'server.console.before'} data={model.server} />
                <div className={'ct-blocks-header'}>
                    <div className={'ct-blocks-title'}>
                        <h1>{model.name}</h1>
                        {model.description && <p>{model.description}</p>}
                    </div>
                    <View name={'server.power'} />
                </div>
                <View name={'server.stats'} />
                <div className={'ct-blocks-terminal'}>
                    <View name={'server.terminal'} />
                </div>
                <View name={'server.graphs'} className={'ct-blocks-graphs'} />
                <Slot name={'server.console.after'} data={model.server} />
                {model.features.map((name) => (
                    <View key={name} name={name} />
                ))}
            </div>
        </ServerContentBlock>
    );
}
