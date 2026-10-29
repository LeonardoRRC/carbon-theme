import { Alert, Button, Input, Label, NamedIcon, Select, TitledGreyBox } from '@pterodactyl/sdk';
import type { NavGroup, ThemePayload, ThemeUpdate } from '../api';
import { iconFor } from './IconEditor';
import IconGlyph from './IconGlyph';

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    svgs: Record<string, string>;
    onChange: (draft: ThemeUpdate) => void;
}

const LABEL = /^[\p{L}\p{N}][\p{L}\p{N} &/.,'()+-]{0,31}$/u;

function IconButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled?: boolean; onClick: () => void }) {
    return (
        <button
            type={'button'}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={'grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30'}
        >
            <NamedIcon name={icon} className={'size-4'} />
        </button>
    );
}

function move<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export default function NavGroupsEditor({ payload, draft, svgs, onChange }: Props) {
    const routes = payload.routes.filter((route) => route.area === 'server' && route.key !== 'server:admin-view');
    const byKey = new Map(routes.map((route) => [route.key, route]));
    const groups = draft.nav_groups;
    const grouped = new Set(groups.flatMap((group) => group.items));
    const ungrouped = routes.filter((route) => !grouped.has(route.key));

    const setGroups = (next: NavGroup[]) => onChange({ ...draft, nav_groups: next });
    const update = (index: number, group: NavGroup) => setGroups(groups.map((g, i) => (i === index ? group : g)));

    const RouteName = ({ routeKey }: { routeKey: string }) => {
        const route = byKey.get(routeKey);
        if (!route) return <span className={'text-muted-foreground'}>{routeKey}</span>;
        const { reference } = iconFor(route, draft);
        return (
            <span className={'flex items-center gap-2 text-sm text-foreground'}>
                <IconGlyph svg={reference ? svgs[reference] : undefined} size={14} />
                {route.label}
                {route.source !== 'Panel' && <span className={'text-xs text-muted-foreground'}>· {route.source}</span>}
            </span>
        );
    };

    return (
        <div className={'flex flex-col gap-6'}>
            {draft.layout.navigation !== 'side' && (
                <Alert type={'info'}>
                    Groups show in the server sidebar. Choose <strong>Sidebar</strong> under Layout → Navigation to use them.
                </Alert>
            )}

            <div className={'grid items-start gap-6 xl:grid-cols-3'}>
                <div className={'flex flex-col gap-4 xl:col-span-2'}>
                    {groups.map((group, index) => {
                        const valid = LABEL.test(group.label);
                        return (
                            <TitledGreyBox
                                key={index}
                                title={
                                    <span className={'flex items-center gap-2'}>
                                        <NamedIcon name={'folder'} className={'size-4'} />
                                        {group.label || 'New group'}
                                    </span>
                                }
                            >
                                <div className={'flex flex-col gap-3'}>
                                    <div className={'flex items-center gap-2'}>
                                        <Input
                                            aria-label={'Group name'}
                                            value={group.label}
                                            maxLength={32}
                                            placeholder={'Management'}
                                            $hasError={!valid}
                                            onChange={(event) => update(index, { ...group, label: event.target.value })}
                                        />
                                        <IconButton icon={'arrow-up'} label={'Move group up'} disabled={index === 0} onClick={() => setGroups(move(groups, index, index - 1))} />
                                        <IconButton icon={'arrow-down'} label={'Move group down'} disabled={index === groups.length - 1} onClick={() => setGroups(move(groups, index, index + 1))} />
                                        <IconButton icon={'trash-2'} label={'Delete group'} onClick={() => setGroups(groups.filter((_, i) => i !== index))} />
                                    </div>
                                    {!valid && <p className={'text-xs text-destructive'}>Use up to 32 letters, numbers, spaces, and simple punctuation.</p>}

                                    <ul className={'flex flex-col divide-y divide-border rounded-md border border-border'}>
                                        {group.items.length === 0 && <li className={'px-3 py-2.5 text-sm text-muted-foreground'}>Add sections to this group.</li>}
                                        {group.items.map((key, position) => (
                                            <li key={key} className={'flex items-center gap-1 px-3 py-1.5'}>
                                                <span className={'flex-1'}>
                                                    <RouteName routeKey={key} />
                                                </span>
                                                <IconButton icon={'chevron-up'} label={'Move up'} disabled={position === 0} onClick={() => update(index, { ...group, items: move(group.items, position, position - 1) })} />
                                                <IconButton icon={'chevron-down'} label={'Move down'} disabled={position === group.items.length - 1} onClick={() => update(index, { ...group, items: move(group.items, position, position + 1) })} />
                                                <IconButton icon={'x'} label={'Remove from group'} onClick={() => update(index, { ...group, items: group.items.filter((item) => item !== key) })} />
                                            </li>
                                        ))}
                                    </ul>

                                    {ungrouped.length > 0 && (
                                        <div className={'flex flex-col gap-2'}>
                                        <Label htmlFor={`ct-add-section-${index}`}>Add a section</Label>
                                        <Select
                                            id={`ct-add-section-${index}`}
                                            value={null}
                                            placeholder={'Add a section…'}
                                            options={ungrouped.map((route) => ({ value: route.key, label: route.source === 'Panel' ? route.label : `${route.label} · ${route.source}` }))}
                                            onChange={(value) => update(index, { ...group, items: [...group.items, String(value)] })}
                                        />
                                        </div>
                                    )}
                                </div>
                            </TitledGreyBox>
                        );
                    })}

                    <div>
                        <Button
                            isSecondary
                            disabled={groups.length >= payload.max_groups}
                            onClick={() => setGroups([...groups, { label: groups.length === 0 ? 'Management' : 'Group', items: [] }])}
                        >
                            Add group
                        </Button>
                    </div>
                </div>

                <TitledGreyBox title={'Sidebar preview'}>
                    <div className={'flex flex-col gap-0.5 text-sm'}>
                        {ungrouped.map((route) => (
                            <div key={route.key} className={'rounded-sm px-3 py-1.5'}>
                                <RouteName routeKey={route.key} />
                            </div>
                        ))}
                        {groups.map((group, index) => (
                            <div key={index} className={'flex flex-col gap-0.5'}>
                                <span className={'px-3 pt-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'}>
                                    {group.label || 'New group'}
                                </span>
                                {group.items.map((key) => (
                                    <div key={key} className={'rounded-sm px-3 py-1.5'}>
                                        <RouteName routeKey={key} />
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className={'mt-2 border-t border-border px-3 pt-2.5 text-xs text-muted-foreground'}>
                            Open Admin Area always comes last. Sections without a group stay at the top.
                        </div>
                    </div>
                </TitledGreyBox>
            </div>
        </div>
    );
}
