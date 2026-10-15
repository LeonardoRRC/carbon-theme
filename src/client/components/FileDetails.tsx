import { useSyncExternalStore } from 'react';
import type { ReplacementProps } from '@pterodactyl/sdk';
import { filesStyle, onLayoutChange } from '../runtime';
import FileIcon from './FileIcon';

/** A file row in the Carbon style: the Panel's row with a tinted, type-aware icon. */
export default function FileDetails({ Default }: ReplacementProps<'server.files.details'>) {
    const style = useSyncExternalStore(onLayoutChange, filesStyle, () => 'panel');

    return style === 'carbon' ? <Default className={'ct-file-row'} parts={{ icon: FileIcon }} /> : <Default />;
}
