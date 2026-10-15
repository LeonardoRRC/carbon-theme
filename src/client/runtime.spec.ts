import { afterEach, expect, test } from 'vitest';
import { drawGroupTitles, navGroups, tagFor } from './runtime';

afterEach(() => {
    document.body.innerHTML = '';
});

function links(html: string): HTMLAnchorElement[] {
    document.body.innerHTML = html;
    return [...document.querySelectorAll('a')];
}

test('tags server tabs, including extension tabs after the core ones', () => {
    const [console, files, votifier] = links(`
        <div>
            <a data-core href="/server/a4302f3f"><span><span>Console</span></span></a>
            <a data-core href="/server/a4302f3f/files#/"><span><span>Files</span></span></a>
            <a href="/server/a4302f3f/votifier"><span><svg></svg><span>Votifier</span></span></a>
        </div>`);

    expect(tagFor(console)).toEqual(['server:console', 'tab']);
    expect(tagFor(files)).toEqual(['server:files', 'tab']);
    expect(tagFor(votifier)).toEqual(['server:votifier', 'tab']);
});

test('tags account tabs and the admin sidebar', () => {
    const [account, api] = links(`<div><a data-core href="/account">Account</a><a data-core href="/account/api">API</a></div>`);
    expect(tagFor(account)).toEqual(['account:overview', 'tab']);
    expect(tagFor(api)).toEqual(['account:api', 'tab']);

    const [overview, nodes, theme] = links(`
        <nav id="admin-sidebar-nav">
            <a href="/panel"><svg></svg>Overview</a>
            <a href="/panel/nodes"><svg></svg>Nodes</a>
            <a href="/panel/carbon-theme"><svg></svg>Carbon Theme</a>
        </nav>`);
    expect(tagFor(overview)).toEqual(['admin:overview', 'side']);
    expect(tagFor(nodes)).toEqual(['admin:nodes', 'side']);
    expect(tagFor(theme)).toEqual(['admin:carbon-theme', 'side']);
});

test('tags only the header icon links and ignores other links', () => {
    const [dashboard, admin, serverCard, external] = links(`
        <div><a aria-label="Dashboard" href="/"><svg></svg></a></div>
        <div><a aria-label="Admin" href="/panel"><svg></svg></a></div>
        <div><a aria-label="Survival" href="/server/a4302f3f"><svg></svg>Survival</a></div>
        <div><a href="https://pterodactyl.io">Docs</a></div>`);

    expect(tagFor(dashboard)).toEqual(['top:dashboard', 'top']);
    expect(tagFor(admin)).toEqual(['top:admin', 'top']);
    expect(tagFor(serverCard)).toBeNull();
    expect(tagFor(external)).toBeNull();
});

test('tags the server admin link in the tab row', () => {
    const [, admin] = links(`
        <div>
            <a data-core href="/server/a4302f3f"><span><span>Console</span></span></a>
            <a aria-label="Open server administration" href="/panel/servers/1"><span><svg></svg><span>Open Admin Area</span></span></a>
        </div>`);
    expect(tagFor(admin)).toEqual(['server:admin-view', 'tab']);
});

test('reads sidebar groups and draws a title for each group the user can see', () => {
    const groups = [
        { label: 'Management', order: 100, items: ['server:files', 'server:databases'] },
        { label: 'Configuración', order: 200, items: ['server:startup'] },
    ];
    const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(groups))));
    document.documentElement.style.setProperty('--ct-nav-groups', `"${encoded}"`);
    expect(navGroups()).toEqual(groups);
    document.documentElement.style.removeProperty('--ct-nav-groups');

    document.body.innerHTML = `
        <div id="row">
            <a data-core data-ct-route="server:console" href="/server/x"></a>
            <a data-core data-ct-route="server:files" href="/server/x/files"></a>
        </div>`;
    const row = document.getElementById('row')!;
    drawGroupTitles(row, groups);
    drawGroupTitles(row, groups); // idempotent

    const titles = [...row.querySelectorAll<HTMLElement>('.ct-nav-heading')];
    expect(titles.map((t) => [t.textContent, t.style.order, t.hidden])).toEqual([
        ['Management', '100', false],
        ['Configuración', '200', true], // no Startup tab for this user
    ]);

    drawGroupTitles(row, groups.slice(0, 1));
    expect(row.querySelectorAll('.ct-nav-heading')).toHaveLength(1);
});
