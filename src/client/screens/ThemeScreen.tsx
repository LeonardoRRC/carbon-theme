import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, NamedIcon, PageContentBlock, ServerError, Spinner, httpErrorToHuman, toast, useExtensionAction } from '@pterodactyl/sdk';
import { getTheme, saveTheme, themeQueryKey, type ThemePayload, type ThemeUpdate } from '../api';
import { fontStack, loadFontForPreview } from '../fonts';
import { refresh, reloadStylesheet, setStylesheetEnabled } from '../runtime';
import BrandingEditor from '../components/BrandingEditor';
import IconEditor from '../components/IconEditor';
import LayoutEditor from '../components/LayoutEditor';
import NavGroupsEditor from '../components/NavGroupsEditor';
import PaletteEditor from '../components/PaletteEditor';
import TypographyEditor from '../components/TypographyEditor';

type Tab = 'palette' | 'layout' | 'typography' | 'branding' | 'icons' | 'groups';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'palette', label: 'Palette', icon: 'palette' },
    { id: 'layout', label: 'Layout', icon: 'layout-panel-left' },
    { id: 'typography', label: 'Typography', icon: 'type' },
    { id: 'branding', label: 'Branding', icon: 'badge-check' },
    { id: 'icons', label: 'Navigation icons', icon: 'shapes' },
    { id: 'groups', label: 'Server sidebar', icon: 'list-tree' },
];

function toDraft({ config }: ThemePayload): ThemeUpdate {
    return {
        preset: config.preset,
        colors: { ...config.colors },
        radius: config.radius,
        tab_icons: config.tab_icons,
        icons: { ...config.icons },
        layout: { ...config.layout },
        logo_mode: config.branding.logo_mode,
        fonts: { body: { ...config.fonts.body }, heading: { ...config.fonts.heading } },
        nav_groups: config.nav_groups.map((group) => ({ label: group.label, items: [...group.items] })),
    };
}

const CONTENT_WIDTHS = { standard: '75rem', wide: 'min(90rem, calc(100% - 3rem))', full: 'calc(100% - 3rem)' } as const;

function encodeGroups(draft: ThemeUpdate): string {
    const groups = draft.nav_groups.map((group, index) => ({ label: group.label, order: (index + 1) * 100, items: group.items }));
    const bytes = new TextEncoder().encode(JSON.stringify(groups));
    return `"${btoa(String.fromCharCode(...bytes))}"`;
}

/**
 * Shows unsaved changes on the whole Panel while the editor is open. Inline custom
 * properties on <html> override the saved stylesheet; leaving the page removes them.
 */
function useLivePreview(draft: ThemeUpdate | null, payload: ThemePayload | undefined) {
    const tokens = useMemo(() => payload?.tokens.map((t) => t.token) ?? [], [payload]);

    useEffect(() => {
        if (!draft || !payload) return;
        const root = document.documentElement;
        const usesPanelColors = draft.preset === 'none';
        const set = (name: string, value: string | null) => (value === null ? root.style.removeProperty(name) : root.style.setProperty(name, value));

        setStylesheetEnabled(!usesPanelColors);
        for (const token of tokens) set(`--${token}`, !usesPanelColors && draft.colors[token] ? draft.colors[token] : null);
        set('--radius', !usesPanelColors && draft.radius !== null ? `${draft.radius}rem` : null);

        for (const role of ['body', 'heading'] as const) {
            loadFontForPreview(draft.fonts[role], payload.config.custom_fonts, payload.config.revision);
        }
        set('--font-sans', fontStack(draft.fonts.body));
        set('--font-header', fontStack(draft.fonts.heading));

        set('--ct-navigation', draft.layout.navigation);
        set('--ct-dashboard', draft.layout.dashboard);
        set('--ct-toasts', draft.layout.toasts);
        set('--ct-console', draft.layout.console);
        set('--ct-files', draft.layout.files);
        set('--ct-auth', draft.layout.auth);
        set('--ct-nav-groups', draft.nav_groups.length ? encodeGroups(draft) : '""');
        set('--layout-content-width', window.matchMedia('(width >= 64rem)').matches ? CONTENT_WIDTHS[draft.layout.content_width] : null);
        set('--layout-sidebar-width', `${draft.layout.sidebar_width}rem`);
        refresh();

        return () => {
            setStylesheetEnabled(true);
            for (const token of tokens) root.style.removeProperty(`--${token}`);
            for (const name of ['--radius', '--font-sans', '--font-header', '--ct-navigation', '--ct-dashboard', '--ct-toasts', '--ct-console', '--ct-files', '--ct-auth', '--ct-nav-groups', '--layout-content-width', '--layout-sidebar-width']) {
                root.style.removeProperty(name);
            }
            refresh();
        };
    }, [draft, payload, tokens]);
}

export default function ThemeScreen() {
    const queryClient = useQueryClient();
    const theme = useQuery({ queryKey: themeQueryKey, queryFn: getTheme });
    const [draft, setDraft] = useState<ThemeUpdate | null>(null);
    const [svgs, setSvgs] = useState<Record<string, string>>({});
    const [tab, setTab] = useState<Tab>('palette');

    // The draft starts from the saved settings and is replaced only by an explicit save or
    // discard, so uploads do not throw away unsaved edits.
    useEffect(() => {
        if (theme.data && draft === null) setDraft(toDraft(theme.data));
        if (theme.data) setSvgs((current) => ({ ...current, ...theme.data.svgs }));
    }, [theme.data, draft]);

    useLivePreview(draft, theme.data);

    const saved = useMemo(() => (theme.data ? JSON.stringify(toDraft(theme.data)) : ''), [theme.data]);
    const dirty = draft !== null && JSON.stringify(draft) !== saved;

    const save = useMutation({
        mutationFn: (update: ThemeUpdate) => saveTheme(update),
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const onSave = useExtensionAction('save theme', async () => {
        if (!draft) return;
        const payload = await save.mutateAsync(draft);
        await reloadStylesheet(payload.config.revision);
        queryClient.setQueryData(themeQueryKey, payload);
        setDraft(toDraft(payload));
        toast.success('Theme saved.');
    });

    /** Uploads save right away; keep the unsaved draft, except fonts the server reset. */
    const onUploaded = (payload: ThemePayload) => {
        void reloadStylesheet(payload.config.revision);
        queryClient.setQueryData(themeQueryKey, payload);
        setDraft((current) => {
            if (!current) return toDraft(payload);
            const families = new Set(payload.config.custom_fonts.map((f) => f.family));
            const keep = (role: 'body' | 'heading') =>
                current.fonts[role].type === 'custom' && !families.has(current.fonts[role].family ?? '') ? payload.config.fonts[role] : current.fonts[role];
            return { ...current, fonts: { body: keep('body'), heading: keep('heading') } };
        });
    };

    if (theme.isError) {
        return <ServerError title={'Could not load the theme'} message={httpErrorToHuman(theme.error)} onRetry={() => theme.refetch()} />;
    }

    if (!theme.data || !draft) {
        return (
            <PageContentBlock title={'Carbon Theme'}>
                <Spinner centered />
            </PageContentBlock>
        );
    }

    return (
        <PageContentBlock title={'Carbon Theme'}>
            <div className={'flex flex-col gap-6'}>
                <div className={'flex flex-col gap-4 md:flex-row md:items-end md:justify-between'}>
                    <div className={'flex flex-col gap-1'}>
                        <h1 className={'font-header text-2xl font-medium text-foreground'}>Carbon Theme</h1>
                        <p className={'text-sm text-muted-foreground'}>
                            Colors, layout, fonts, and branding for every user. Changes preview here and apply to everyone when saved.
                        </p>
                    </div>
                    <div className={'flex items-center gap-2'}>
                        {dirty && <span className={'mr-2 text-xs text-warning'}>Unsaved changes</span>}
                        <Button isSecondary disabled={!dirty || save.isPending} onClick={() => setDraft(toDraft(theme.data))}>
                            Discard
                        </Button>
                        <Button disabled={!dirty} isLoading={save.isPending} onClick={onSave}>
                            Save
                        </Button>
                    </div>
                </div>

                <div role={'tablist'} aria-label={'Theme settings'} className={'flex gap-1 overflow-x-auto border-b border-border'}>
                    {TABS.map((item) => (
                        <button
                            key={item.id}
                            type={'button'}
                            role={'tab'}
                            aria-selected={tab === item.id}
                            onClick={() => setTab(item.id)}
                            className={[
                                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors',
                                tab === item.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                            ].join(' ')}
                        >
                            <NamedIcon name={item.icon} className={'size-4'} />
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'palette' && <PaletteEditor payload={theme.data} draft={draft} onChange={setDraft} />}
                {tab === 'layout' && <LayoutEditor payload={theme.data} draft={draft} onChange={setDraft} />}
                {tab === 'typography' && <TypographyEditor payload={theme.data} draft={draft} onChange={setDraft} onUploaded={onUploaded} />}
                {tab === 'branding' && <BrandingEditor payload={theme.data} draft={draft} onChange={setDraft} onUploaded={onUploaded} />}
                {tab === 'icons' && (
                    <IconEditor
                        payload={theme.data}
                        draft={draft}
                        svgs={svgs}
                        onChange={setDraft}
                        onSvg={(reference, svg) => setSvgs((current) => ({ ...current, [reference]: svg }))}
                    />
                )}
                {tab === 'groups' && <NavGroupsEditor payload={theme.data} draft={draft} svgs={svgs} onChange={setDraft} />}
            </div>
        </PageContentBlock>
    );
}
