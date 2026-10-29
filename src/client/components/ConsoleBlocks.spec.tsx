import { afterEach, beforeAll, expect, test } from 'vitest';
import { preloadTheme, renderView, type RenderedView } from '@pterodactyl/sdk/testing';
import theme from '../index';

const themes = [theme];
let rendered: RenderedView | undefined;

beforeAll(() => preloadTheme(themes));
afterEach(() => {
    rendered?.unmount();
    rendered = undefined;
    delete document.documentElement.dataset.ctConsoleStyle;
});

const labels = () => [...(rendered?.container.querySelectorAll('.ct-block-head') ?? [])].map((head) => head.textContent);

test('draws the stats as six titled blocks in the Blocks design', () => {
    document.documentElement.dataset.ctConsoleStyle = 'blocks';
    rendered = renderView('server.stats', { themes, fixture: 'running' });

    expect(labels()).toEqual(['Status', 'IP Address', 'Server ID', 'CPU', 'RAM', 'Storage']);
    expect(rendered.container.querySelector('.ct-block-status')?.textContent).toContain('Running');
});

test('builds the console page around a full-width terminal, keeping its slots', () => {
    document.documentElement.dataset.ctConsoleStyle = 'blocks';
    rendered = renderView('page.server.console', {
        themes,
        fixture: 'default',
        input: { active: true },
        slots: {
            'server.console.before': () => <span>before-slot</span>,
            'server.console.after': () => <span>after-slot</span>,
        },
    });

    const page = rendered.container.querySelector('.ct-blocks-page');
    expect(page?.querySelector('.ct-blocks')).not.toBeNull();
    expect(page?.querySelector('.ct-blocks-terminal')).not.toBeNull();
    expect(page?.textContent).toContain('before-slot');
    expect(page?.textContent).toContain('after-slot');
});

test('keeps the layer below in the other designs', () => {
    document.documentElement.dataset.ctConsoleStyle = 'carbon';
    rendered = renderView('page.server.console', { themes, fixture: 'default', input: { active: true } });

    expect(rendered.container.querySelector('.ct-blocks-page')).toBeNull();
    expect(rendered.container.querySelector('h1')).not.toBeNull();
});
