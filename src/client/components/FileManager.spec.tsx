import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createComponentTestHost, createTestFileManager, createTestFileManagerEntry } from '@pterodactyl/sdk/testing';
import FileManager from './FileManager';
import { iconFor } from './FileIcon';

let dispose: (() => void) | undefined;
afterEach(() => {
    cleanup();
    dispose?.();
    dispose = undefined;
    delete document.documentElement.dataset.ctFilesStyle;
});

test('picks an icon and color from the file kind and extension', () => {
    expect(iconFor({ name: 'plugins', kind: 'directory' })).toEqual(['folder', 'primary']);
    expect(iconFor({ name: 'server.jar', kind: 'file' })).toEqual(['coffee', 'success']);
    expect(iconFor({ name: 'server.properties', kind: 'file' })).toEqual(['file-cog', 'accent']);
    expect(iconFor({ name: 'backup.TAR.GZ', kind: 'file' })).toEqual(['file-archive', 'warning']);
    expect(iconFor({ name: 'latest.log', kind: 'file' })).toEqual(['file-text', 'muted']);
    expect(iconFor({ name: 'LICENSE', kind: 'file' })).toEqual(['file', 'muted']);
});

test('shows the folder summary around the native toolbar and list', async () => {
    document.documentElement.dataset.ctFilesStyle = 'carbon';
    const host = createComponentTestHost('server.files.manager', {
        model: createTestFileManager({
            directory: '/plugins',
            entries: [
                createTestFileManagerEntry({ name: 'Votifier', kind: 'directory' }),
                createTestFileManagerEntry({ name: 'Votifier.jar', kind: 'file', size: 2048 }),
                createTestFileManagerEntry({ name: 'config.yml', kind: 'file', size: 1024 }),
            ],
        }),
    });
    dispose = host.dispose;
    render(<FileManager {...host.props} />, { wrapper: host.Wrapper });

    // The folder name shows in the header and in the Panel's own breadcrumb inside the window.
    expect(await screen.findAllByText('plugins')).toHaveLength(2);
    expect(document.querySelector('.ct-files-title')?.textContent).toBe('plugins');
    expect(document.querySelector('.ct-files-bar')?.textContent).toContain('plugins');
    expect(screen.getByText('1 folder')).toBeTruthy();
    expect(screen.getByText('2 files')).toBeTruthy();
    expect(screen.getByText('3.00 KiB')).toBeTruthy();
});
