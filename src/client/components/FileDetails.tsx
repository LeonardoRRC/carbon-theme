import { useSyncExternalStore } from 'react';
import { bytesToString, formatDate, fromNow } from '@pterodactyl/sdk';
import type { ViewProps } from '@pterodactyl/sdk/theme';
import { filesStyle, onLayoutChange } from '../runtime';
import FileIcon from './FileIcon';

const HOUR = 60 * 60 * 1000;

/**
 * A file row in the Carbon style: the Panel's row (name, size, and when it changed) with a tinted,
 * type-aware icon. Presentation only: selection, menus, and opening the file stay the Panel's.
 */
export default function FileDetails({ model, className, Default }: ViewProps<'server.files.details'>) {
    const style = useSyncExternalStore(onLayoutChange, filesStyle, () => 'panel');
    if (style !== 'carbon') return <Default />;

    const hours = Math.trunc((Date.parse(model.modifiedAt) - Date.now()) / HOUR);

    return (
        <div className={className ? `ct-file-row flex min-w-0 flex-1 items-center ${className}` : 'ct-file-row flex min-w-0 flex-1 items-center'}>
            <FileIcon model={model} />
            <div className={'flex-1 truncate'}>{model.name}</div>
            {model.kind !== 'directory' && (
                <div className={'mr-4 hidden w-1/6 text-right sm:block'}>{bytesToString(model.size)}</div>
            )}
            <div className={'mr-4 hidden w-1/5 text-right md:block'} title={model.modifiedAt}>
                {Math.abs(hours) > 48 ? formatDate(model.modifiedAt, 'MMM Do, YYYY h:mmA') : fromNow(model.modifiedAt)}
            </div>
        </div>
    );
}
