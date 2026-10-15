/**
 * Runs on every page. The theme itself is the Panel's applied theme stylesheet
 * (/assets/theme.css, linked in the page head). This reads the layout it declares, tags
 * navigation links so it can give them icons, and draws the server sidebar's group titles.
 */
const STYLESHEET = 'link[rel="stylesheet"][href^="/assets/theme.css"]';

function readVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const layoutListeners = new Set<() => void>();

/** Calls the listener whenever the dashboard or navigation layout changes. */
export function onLayoutChange(listener: () => void): () => void {
    layoutListeners.add(listener);
    return () => layoutListeners.delete(listener);
}

export function consoleStyle(): 'panel' | 'carbon' {
    return document.documentElement.dataset.ctConsoleStyle === 'carbon' ? 'carbon' : 'panel';
}

export function filesStyle(): 'panel' | 'carbon' {
    return document.documentElement.dataset.ctFilesStyle === 'carbon' ? 'carbon' : 'panel';
}

export function authStyle(): 'panel' | 'centered' | 'split' {
    const style = document.documentElement.dataset.ctAuthStyle;
    return style === 'centered' || style === 'split' ? style : 'panel';
}

export function dashboardMode(): 'panel' | 'rows' | 'cards' {
    const mode = document.documentElement.dataset.ctDashboard;
    return mode === 'panel' || mode === 'cards' ? mode : 'rows';
}

/**
 * Applies the layout the stylesheet declares in --ct-navigation and --ct-dashboard. A
 * stylesheet cannot set the attributes the Panel's side navigation and the server cards key
 * off, so this does.
 */
export function applyLayout(): void {
    const root = document.documentElement;
    const navigation = readVar('--ct-navigation');
    const dashboard = readVar('--ct-dashboard') || 'panel';
    const toasts = readVar('--ct-toasts') || 'panel';
    const consoleStyle = readVar('--ct-console') || 'panel';
    const filesStyle = readVar('--ct-files') || 'panel';
    const authStyle = readVar('--ct-auth') || 'panel';
    const hasLogo = readVar('--ct-logo') !== '';

    if (navigation === 'side') root.setAttribute('data-sub-navigation', 'side');
    else root.removeAttribute('data-sub-navigation');
    if (root.dataset.ctToasts !== toasts) root.dataset.ctToasts = toasts;
    if (hasLogo) root.dataset.ctLogo = '';
    else delete root.dataset.ctLogo;
    if (root.dataset.ctConsoleStyle !== consoleStyle || root.dataset.ctFilesStyle !== filesStyle || root.dataset.ctAuthStyle !== authStyle) {
        root.dataset.ctConsoleStyle = consoleStyle;
        root.dataset.ctFilesStyle = filesStyle;
        root.dataset.ctAuthStyle = authStyle;
        layoutListeners.forEach((listener) => listener());
    }

    if (root.dataset.ctDashboard !== dashboard) {
        root.dataset.ctDashboard = dashboard;
        layoutListeners.forEach((listener) => listener());
    }
    scheduleScan();
}

/** Loads a newly saved revision. The old sheet stays until the new one has loaded, so nothing flashes. */
export function reloadStylesheet(revision: number): Promise<void> {
    const current = document.querySelector<HTMLLinkElement>(STYLESHEET);
    const next = document.createElement('link');
    next.rel = 'stylesheet';
    next.href = `/assets/theme.css?v=${revision}-${Date.now()}`;

    return new Promise((resolve) => {
        const done = () => {
            current?.remove();
            applyLayout();
            resolve();
        };
        next.addEventListener('load', done, { once: true });
        next.addEventListener('error', done, { once: true });
        if (current) current.after(next);
        else document.head.appendChild(next);
    });
}

/** Turns the saved stylesheet off or on, for previewing the Panel's own colors. */
export function setStylesheetEnabled(enabled: boolean): void {
    const link = document.querySelector<HTMLLinkElement>(STYLESHEET);
    if (link) link.disabled = !enabled;
}

type Tag = [key: string, slot: 'tab' | 'side' | 'top'];

const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function join(parts: string[], fallback: string): string | null {
    if (parts.length === 0) return fallback;

    return parts.every((part) => SEGMENT.test(part)) ? parts.join('/') : null;
}

/** The route key ("<area>:<path>") and position of a navigation link, or null for other links. */
export function tagFor(link: HTMLAnchorElement): Tag | null {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/')) return null;

    const parts = new URL(href, window.location.origin).pathname.split('/').filter(Boolean);

    if (link.closest('#admin-sidebar-nav')) {
        const path = parts[0] === 'panel' ? join(parts.slice(1), 'overview') : null;

        return path ? [`admin:${path}`, 'side'] : null;
    }

    // Server and account tabs: core tabs carry data-core, extension tabs follow them.
    if (link.parentElement?.querySelector(':scope > a[data-core]')) {
        if (parts[0] === 'server' && parts.length >= 2) {
            const path = join(parts.slice(2), 'console');
            return path ? [`server:${path}`, 'tab'] : null;
        }
        if (parts[0] === 'account') {
            const path = join(parts.slice(1), 'overview');
            return path ? [`account:${path}`, 'tab'] : null;
        }
        // The server's "Open Admin Area" link, shown to administrators.
        if (parts[0] === 'panel' && parts[1] === 'servers') return ['server:admin-view', 'tab'];

        return null;
    }

    if (link.hasAttribute('aria-label') && link.querySelector(':scope > svg')) {
        if (parts.length === 0) return ['top:dashboard', 'top'];
        if (parts.length === 1 && parts[0] === 'panel') return ['top:admin', 'top'];
    }

    return null;
}

export interface NavGroup {
    label: string;
    order: number;
    items: string[];
}

/** The server sidebar groups the stylesheet declares in --ct-nav-groups (base64 JSON). */
export function navGroups(): NavGroup[] {
    const raw = readVar('--ct-nav-groups').replace(/^["']|["']$/g, '');
    if (!raw) return [];
    try {
        const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
        const groups = JSON.parse(new TextDecoder().decode(bytes));
        return Array.isArray(groups) ? groups : [];
    } catch {
        return [];
    }
}

/**
 * Adds a title before each group in the server tab container. Titles are ordered with CSS
 * `order` like the items, and hidden when the user can see none of their items.
 */
export function drawGroupTitles(container: Element, groups: NavGroup[]): void {
    const present = new Set(
        [...container.querySelectorAll<HTMLElement>(':scope > a[data-ct-route]')].map((a) => a.dataset.ctRoute),
    );
    const existing = [...container.querySelectorAll<HTMLElement>(':scope > .ct-nav-heading')];

    groups.forEach((group, index) => {
        let heading = existing[index];
        if (!heading) {
            heading = document.createElement('div');
            heading.className = 'ct-nav-heading';
            heading.setAttribute('role', 'presentation');
            container.appendChild(heading);
        }
        if (heading.textContent !== group.label) heading.textContent = group.label;
        if (heading.style.order !== String(group.order)) heading.style.order = String(group.order);
        const visible = group.items.some((key) => present.has(key));
        if (heading.hidden === visible) heading.hidden = !visible;
    });
    existing.slice(groups.length).forEach((heading) => heading.remove());
}

type ConsolePart = 'root' | 'header' | 'main' | 'terminal' | 'stats' | 'charts';

function mark(element: Element | null | undefined, part: ConsolePart): void {
    if (element instanceof HTMLElement && element.dataset.ctConsole !== part) element.dataset.ctConsole = part;
}

/**
 * Marks the blocks of the server console page so the Carbon console style can target
 * them: the page, its header (name and power buttons), the row with the terminal and the
 * stat tiles, and the charts. Found from the terminal, by structure rather than class names.
 */
export function tagConsole(doc: ParentNode = document): void {
    const terminal = doc.querySelector('.bg-terminal');
    if (!terminal) return;

    // Climb to the row that holds the terminal: the first ancestor whose siblings include the header.
    let main: Element | null = terminal;
    while (main?.parentElement && !main.parentElement.querySelector(':scope > * h1')) main = main.parentElement;
    const page = main?.parentElement;
    if (!main || !page) return;

    mark(page, 'root');
    mark(main, 'main');
    mark([...page.children].find((child) => child.querySelector('h1')), 'header');
    mark([...page.children].find((child) => child !== main && child.querySelector('.recharts-wrapper')), 'charts');
    for (const column of main.children) mark(column, column.contains(terminal) ? 'terminal' : 'stats');
}

type AuthPart = 'layout' | 'box' | 'card' | 'mark' | 'title' | 'footer';

function markAuth(element: Element | null | undefined, part: AuthPart): void {
    if (element instanceof HTMLElement && element.dataset.ctAuth !== part) element.dataset.ctAuth = part;
}

/**
 * Marks the sign-in pages' blocks: the page, the box with the title, the form card with
 * its Pterodactyl mark, and the footer. Every sign-in view shares this structure.
 */
export function tagAuth(doc: ParentNode = document): void {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) return;
    const form = doc.querySelector('form');
    const box = form?.parentElement;
    if (!form || !box || !box.querySelector(':scope > h2, :scope > p')) return;

    markAuth(box.parentElement, 'layout');
    markAuth(box, 'box');
    markAuth(box.querySelector(':scope > h2'), 'title');
    markAuth([...box.children].filter((child) => child.tagName === 'P').pop(), 'footer');
    const card = form.firstElementChild;
    markAuth(card, 'card');
    markAuth(card?.firstElementChild, 'mark');
}

function tagAll(root: ParentNode): void {
    tagConsole(root);
    tagAuth(root);

    const serverRows = new Set<Element>();
    for (const link of root.querySelectorAll<HTMLAnchorElement>(
        '#admin-sidebar-nav a[href], a[data-core][href], a[data-core] ~ a[href], a[aria-label][href]',
    )) {
        const tag = tagFor(link);
        if (!tag) continue;
        if (link.dataset.ctRoute !== tag[0]) link.dataset.ctRoute = tag[0];
        if (link.dataset.ctSlot !== tag[1]) link.dataset.ctSlot = tag[1];
        if (tag[0].startsWith('server:') && link.parentElement) serverRows.add(link.parentElement);
    }

    const groups = navGroups();
    serverRows.forEach((row) => drawGroupTitles(row, groups));
}

let observer: MutationObserver | null = null;
let scheduled = false;

function scheduleScan(): void {
    if (scheduled || typeof requestAnimationFrame === 'undefined') return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        tagAll(document);
    });
}

/** Re-reads the layout and redraws navigation decorations, for live previews. */
export function refresh(): void {
    applyLayout();
}

function stylesheetsLoaded(): Promise<unknown> {
    const pending = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter((link) => !link.sheet);
    return Promise.all(pending.map((link) => new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
    })));
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Shows the Panel once the stylesheets and the replaced components are loaded and the page has
 * been tagged, so the Panel's own layout never flashes. A failed import does not hold it back.
 */
async function reveal(preload: Promise<unknown>[]): Promise<void> {
    await Promise.allSettled([...preload, stylesheetsLoaded()]);
    await nextFrame();
    await nextFrame();
    document.documentElement.dataset.ctReady = '';
}

export function start(preload: Promise<unknown>[] = []): void {
    if (observer) return;
    if (typeof requestAnimationFrame !== 'undefined') void reveal(preload);

    applyLayout();
    // The stylesheet may finish loading after setup on a slow connection.
    document.querySelector<HTMLLinkElement>(STYLESHEET)?.addEventListener('load', applyLayout, { once: true });

    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    scheduleScan();
}
