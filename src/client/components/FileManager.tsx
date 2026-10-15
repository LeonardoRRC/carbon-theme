import { useSyncExternalStore } from 'react';
import { NamedIcon, type ReplacementProps } from '@pterodactyl/sdk';
import { filesStyle, onLayoutChange } from '../runtime';
import { formatBytes } from './ServerCard';

/**
 * The file manager in the Carbon style: a header with the current folder and what it holds,
 * and the Panel's own toolbar, list, and selection bar inside a framed window. All actions
 * stay the Panel's; this only arranges and decorates them.
 */
export default function FileManager({ model, parts, Default }: ReplacementProps<'server.files.manager'>) {
    const style = useSyncExternalStore(onLayoutChange, filesStyle, () => 'panel');
    if (style !== 'carbon') return <Default />;

    const { toolbar: Toolbar, list: List, selection: Selection } = parts;
    const folders = model.entries.filter((entry) => entry.kind === 'directory').length;
    const files = model.entries.length - folders;
    const size = model.entries.reduce((total, entry) => total + (entry.kind === 'directory' ? 0 : entry.size), 0);
    const name = model.directory === '/' ? 'container' : model.directory.split('/').filter(Boolean).pop();

    return (
        <div className={'ct-files'}>
            <div className={'ct-files-head'}>
                <span className={'ct-files-head-icon'} aria-hidden>
                    <NamedIcon name={'folder-open'} />
                </span>
                <div className={'ct-files-head-text'}>
                    <p className={'ct-files-title'}>{name}</p>
                    <p className={'ct-files-meta'}>
                        {model.loading ? (
                            'Loading…'
                        ) : (
                            <>
                                <span>{folders === 1 ? '1 folder' : `${folders} folders`}</span>
                                <span>{files === 1 ? '1 file' : `${files} files`}</span>
                                <span>{formatBytes(size)}</span>
                                {model.truncated && <span>Showing the first {model.entries.length}</span>}
                            </>
                        )}
                    </p>
                </div>
                {model.refreshing && <span className={'ct-files-refreshing'}>Refreshing…</span>}
            </div>

            <div className={'ct-files-window'}>
                <div className={'ct-files-bar'}>
                    <Toolbar model={model} />
                </div>
                <div className={'ct-files-list'}>
                    <List model={model} />
                </div>
            </div>

            <div className={'ct-files-selection'}>
                <Selection model={model} />
            </div>
        </div>
    );
}
