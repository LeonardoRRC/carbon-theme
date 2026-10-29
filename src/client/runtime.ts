/**
 * Runs on every page. Carbon's base stylesheet is the theme stylesheet the Panel links in the page
 * head; the stylesheet built from the saved configuration is served by the extension and linked
 * here. This reads the layout it declares, tags navigation links so it can give them icons, and
 * draws the server sidebar's group titles.
 */
const STYLESHEET_URL = '/extensions/carbon-theme/theme.css';
const STYLESHEET = 'link[rel="stylesheet"][data-carbon-theme]';

/** Links the configured stylesheet once, before the Panel is revealed. */
export function linkStylesheet(): HTMLLinkElement {
    const existing = document.querySelector<HTMLLinkElement>(STYLESHEET);
    if (existing) return existing;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLESHEET_URL;
    link.dataset.carbonTheme = '';
    document.head.appendChild(link);

    return link;
}

function readVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const layoutListeners = new Set<() => void>();

/** Calls the listener whenever the dashboard or navigation layout changes. */
export function onLayoutChange(listener: () => void): () => void {
    layoutListeners.add(listener);
    return () => layoutListeners.delete(listener);
}

export function consoleStyle(): 'panel' | 'carbon' | 'blocks' {
    const style = document.documentElement.dataset.ctConsoleStyle;
    return style === 'carbon' || style === 'blocks' ? style : 'panel';
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
 * The administration area, which keeps its own sidebar and draws its detail tabs as tabs. Read
 * from the page on show rather than the URL: the Panel changes the URL first and keeps the old
 * page up while its transition runs, which can take a few seconds.
 */
function inAdminArea(): boolean {
    return typeof document !== 'undefined' && document.getElementById('admin-sidebar-nav') !== null;
}

/**
 * The Panel draws every sub-navigation as a sidebar while <html data-sub-navigation="side"> is
 * set. Carbon's side navigation is for server and account pages, so the admin area's resource
 * tabs keep their row. Checked again on every page change.
 */
function syncSubNavigation(navigation = readVar('--ct-navigation')): void {
    const root = document.documentElement;
    const side = navigation === 'side' && !inAdminArea();
    if (side && root.getAttribute('data-sub-navigation') !== 'side') root.setAttribute('data-sub-navigation', 'side');
    else if (!side && root.hasAttribute('data-sub-navigation')) root.removeAttribute('data-sub-navigation');
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

    syncSubNavigation(navigation);
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
    next.href = `${STYLESHEET_URL}?v=${revision}-${Date.now()}`;
    next.dataset.carbonTheme = '';

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

    // Server and account tabs: every item of the Panel's sub-navigation carries data-nav-item.
    if (link.hasAttribute('data-nav-item')) {
        if (parts[0] === 'server' && parts.length >= 2) {
            const path = join(parts.slice(2), 'console');
            return path ? [`server:${path}`, 'tab'] : null;
        }
        if (parts[0] === 'account') {
            const path = join(parts.slice(1), 'overview');
            return path ? [`account:${path}`, 'tab'] : null;
        }
        // The server's "Open Admin Area" link, shown to administrators. In the admin area the
        // server's own detail tabs (About, Details, Build...) link there too, and stay untagged.
        if (parts[0] === 'panel' && parts[1] === 'servers' && parts.length === 3 && !inAdminArea()) {
            return ['server:admin-view', 'tab'];
        }

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
    // Decorative previews, such as the console designs in Carbon's own editor, sit in aria-hidden markup.
    const terminal = [...doc.querySelectorAll('.bg-terminal')].find((element) => !element.closest('[aria-hidden="true"]'));
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
    // A page change re-renders the page, which lands here; the admin area keeps its tab row.
    syncSubNavigation();
    tagConsole(root);
    tagAuth(root);

    const serverRows = new Set<Element>();
    for (const link of root.querySelectorAll<HTMLAnchorElement>(
        '#admin-sidebar-nav a[href], a[data-nav-item][href], a[aria-label][href]',
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
    // Linked before reveal() looks for pending stylesheets, so the Panel waits for it.
    const stylesheet = linkStylesheet();
    if (typeof requestAnimationFrame !== 'undefined') void reveal(preload);

    applyLayout();
    // The stylesheet usually finishes loading after setup.
    stylesheet.addEventListener('load', applyLayout, { once: true });

    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    scheduleScan();
}
