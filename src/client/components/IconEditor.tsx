import { useState } from 'react';
import { Button, Switch, Table, TitledGreyBox } from '@pterodactyl/sdk';
import type { NavRoute, ThemePayload, ThemeUpdate } from '../api';
import IconGlyph from './IconGlyph';
import IconPicker from './IconPicker';

const AREAS: { id: NavRoute['area']; title: string; description: string }[] = [
    { id: 'top', title: 'Top bar', description: 'The icon links in the Panel header.' },
    { id: 'server', title: 'Server', description: 'The tabs on every server page.' },
    { id: 'account', title: 'Account', description: 'The tabs on the account pages.' },
    { id: 'admin', title: 'Administration', description: 'The administration sidebar.' },
];

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    svgs: Record<string, string>;
    onChange: (draft: ThemeUpdate) => void;
    onSvg: (reference: string, svg: string) => void;
}

/** The icon a route shows with the draft settings, and whether it was chosen here. */
export function iconFor(route: NavRoute, draft: ThemeUpdate): { reference: string | null; custom: boolean } {
    const chosen = draft.icons[route.key];
    if (chosen) return { reference: chosen, custom: true };
    if (route.tab && !draft.tab_icons) return { reference: null, custom: false };

    return { reference: route.default_icon, custom: false };
}

export default function IconEditor({ payload, draft, svgs, onChange, onSvg }: Props) {
    const [editing, setEditing] = useState<NavRoute | null>(null);

    const setIcon = (key: string, reference: string | null) => {
        const icons = { ...draft.icons };
        if (reference) icons[key] = reference;
        else delete icons[key];
        onChange({ ...draft, icons });
    };

    const changed = Object.keys(draft.icons).length;

    return (
        <div className={'flex flex-col gap-6'}>
            <TitledGreyBox title={'Navigation icons'}>
                <div className={'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'}>
                    <Switch
                        checked={draft.tab_icons}
                        onChange={(checked) => onChange({ ...draft, tab_icons: checked })}
                        label={'Show icons on server and account tabs'}
                        description={'The Panel shows these tabs as text only. Turn this on to give each one an icon.'}
                    />
                    {changed > 0 && (
                        <Button.Text size={'small'} onClick={() => onChange({ ...draft, icons: {} })}>
                            Reset {changed} custom {changed === 1 ? 'icon' : 'icons'}
                        </Button.Text>
                    )}
                </div>
            </TitledGreyBox>

            {AREAS.map((area) => {
                const rows = payload.routes.filter((route) => route.area === area.id);
                if (rows.length === 0) return null;

                return (
                    <TitledGreyBox key={area.id} title={area.title}>
                        <p className={'mb-4 text-sm text-muted-foreground'}>{area.description}</p>
                        <Table
                            rows={rows}
                            keyOf={(route) => route.key}
                            emptyState={'No routes.'}
                            columns={[
                                {
                                    id: 'icon',
                                    label: 'Icon',
                                    cell: (route) => {
                                        const { reference } = iconFor(route, draft);
                                        return (
                                            <span className={'flex size-8 items-center justify-center rounded-md bg-muted text-foreground'}>
                                                <IconGlyph svg={reference ? svgs[reference] : undefined} size={18} />
                                            </span>
                                        );
                                    },
                                },
                                {
                                    id: 'route',
                                    label: 'Route',
                                    cell: (route) => (
                                        <span className={'flex flex-col gap-0.5'}>
                                            <span className={'flex items-center gap-2 font-medium text-foreground'}>
                                                {route.label}
                                                {route.source !== 'Panel' && (
                                                    <span className={'rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-normal text-accent'}>
                                                        {route.source}
                                                    </span>
                                                )}
                                            </span>
                                            <span className={'font-mono text-xs text-muted-foreground'}>{route.path}</span>
                                        </span>
                                    ),
                                },
                                {
                                    id: 'source',
                                    label: 'Icon name',
                                    cell: (route) => {
                                        const { reference, custom } = iconFor(route, draft);
                                        return (
                                            <span className={'flex flex-col gap-0.5 text-xs'}>
                                                <span className={'font-mono text-foreground'}>{reference ?? 'None'}</span>
                                                <span className={'text-muted-foreground'}>{custom ? 'Custom' : 'Default'}</span>
                                            </span>
                                        );
                                    },
                                },
                                {
                                    id: 'actions',
                                    label: '',
                                    cell: (route) => (
                                        <span className={'flex justify-end gap-2'}>
                                            {draft.icons[route.key] && (
                                                <Button.Text size={'xsmall'} onClick={() => setIcon(route.key, null)}>
                                                    Reset
                                                </Button.Text>
                                            )}
                                            <Button size={'xsmall'} isSecondary onClick={() => setEditing(route)}>
                                                Change
                                            </Button>
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </TitledGreyBox>
                );
            })}

            {editing && (
                <IconPicker
                    open
                    title={`Icon for ${editing.label}`}
                    catalog={payload.icons}
                    current={iconFor(editing, draft).reference}
                    onClose={() => setEditing(null)}
                    onSelect={(reference, svg) => {
                        onSvg(reference, svg);
                        setIcon(editing.key, reference);
                        setEditing(null);
                    }}
                />
            )}
        </div>
    );
}
