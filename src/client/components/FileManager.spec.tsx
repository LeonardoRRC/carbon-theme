import { afterEach, beforeAll, expect, test } from 'vitest';
import { preloadTheme, renderView, type RenderedView } from '@pterodactyl/sdk/testing';
import theme from '../index';
import { iconFor } from './FileIcon';

const themes = [theme];
let rendered: RenderedView | undefined;

// The views are lazy; loading their chunks first lets renderView render them at once.
beforeAll(() => preloadTheme(themes));
afterEach(() => {
    rendered?.unmount();
    rendered = undefined;
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

test('frames the native toolbar and list under the folder summary', () => {
    document.documentElement.dataset.ctFilesStyle = 'carbon';
    rendered = renderView('server.files.manager', { themes, fixture: 'directory' });

    expect(rendered.container.querySelector('.ct-files-title')?.textContent).toBeTruthy();
    expect(rendered.container.querySelector('.ct-files-meta')?.textContent).toMatch(/folders?/);
    expect(rendered.container.querySelector('.ct-files-bar')?.childElementCount).toBeGreaterThan(0);
    expect(rendered.container.querySelector('.ct-files-list')?.childElementCount).toBeGreaterThan(0);
});

test("keeps classic's file manager in the Panel style", () => {
    rendered = renderView('server.files.manager', { themes, fixture: 'directory' });

    expect(rendered.container.querySelector('.ct-files')).toBeNull();
});

test('draws file rows with the tinted icon in the Carbon style', () => {
    document.documentElement.dataset.ctFilesStyle = 'carbon';
    rendered = renderView('server.files.details', { themes, fixture: 'file' });

    expect(rendered.container.querySelector('.ct-file-row .ct-file-icon')).not.toBeNull();
});

test('places the native identity in the Carbon server card, with its slot', () => {
    rendered = renderView('dashboard.serverCard', {
        themes,
        fixture: 'running',
        slots: { 'dashboard.serverRow.name.after': () => <span>name-slot</span> },
    });

    expect(rendered.container.querySelector('.ct-card')).not.toBeNull();
    expect(rendered.container.textContent).toContain('name-slot');
});
