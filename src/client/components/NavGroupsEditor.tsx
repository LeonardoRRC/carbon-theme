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
            className={'ct:grid ct:size-7 ct:place-items-center ct:rounded-sm ct:text-muted-foreground ct:transition-colors ct:hover:bg-muted ct:hover:text-foreground ct:disabled:pointer-events-none ct:disabled:opacity-30'}
        >
            <NamedIcon name={icon} className={'ct:size-4'} />
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
        if (!route) return <span className={'ct:text-muted-foreground'}>{routeKey}</span>;
        const { reference } = iconFor(route, draft);
        return (
            <span className={'ct:flex ct:items-center ct:gap-2 ct:text-sm ct:text-foreground'}>
                <IconGlyph svg={reference ? svgs[reference] : undefined} size={14} />
                {route.label}
                {route.source !== 'Panel' && <span className={'ct:text-xs ct:text-muted-foreground'}>· {route.source}</span>}
            </span>
        );
    };

    return (
        <div className={'ct:flex ct:flex-col ct:gap-6'}>
            {draft.layout.navigation !== 'side' && (
                <Alert type={'info'}>
                    Groups show in the server sidebar. Choose <strong>Sidebar</strong> under Layout → Navigation to use them.
                </Alert>
            )}

            <div className={'ct:grid ct:items-start ct:gap-6 ct:xl:grid-cols-3'}>
                <div className={'ct:flex ct:flex-col ct:gap-4 ct:xl:col-span-2'}>
                    {groups.map((group, index) => {
                        const valid = LABEL.test(group.label);
                        return (
                            <TitledGreyBox
                                key={index}
                                title={
                                    <span className={'ct:flex ct:items-center ct:gap-2'}>
                                        <NamedIcon name={'folder'} className={'ct:size-4'} />
                                        {group.label || 'New group'}
                                    </span>
                                }
                            >
                                <div className={'ct:flex ct:flex-col ct:gap-3'}>
                                    <div className={'ct:flex ct:items-center ct:gap-2'}>
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
                                    {!valid && <p className={'ct:text-xs ct:text-destructive'}>Use up to 32 letters, numbers, spaces, and simple punctuation.</p>}

                                    <ul className={'ct:flex ct:flex-col ct:divide-y ct:divide-border ct:rounded-md ct:border ct:border-border'}>
                                        {group.items.length === 0 && <li className={'ct:px-3 ct:py-2.5 ct:text-sm ct:text-muted-foreground'}>Add sections to this group.</li>}
                                        {group.items.map((key, position) => (
                                            <li key={key} className={'ct:flex ct:items-center ct:gap-1 ct:px-3 ct:py-1.5'}>
                                                <span className={'ct:flex-1'}>
                                                    <RouteName routeKey={key} />
                                                </span>
                                                <IconButton icon={'chevron-up'} label={'Move up'} disabled={position === 0} onClick={() => update(index, { ...group, items: move(group.items, position, position - 1) })} />
                                                <IconButton icon={'chevron-down'} label={'Move down'} disabled={position === group.items.length - 1} onClick={() => update(index, { ...group, items: move(group.items, position, position + 1) })} />
                                                <IconButton icon={'x'} label={'Remove from group'} onClick={() => update(index, { ...group, items: group.items.filter((item) => item !== key) })} />
                                            </li>
                                        ))}
                                    </ul>

                                    {ungrouped.length > 0 && (
                                        <div className={'ct:flex ct:flex-col ct:gap-2'}>
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
                    <div className={'ct:flex ct:flex-col ct:gap-0.5 ct:text-sm'}>
                        {ungrouped.map((route) => (
                            <div key={route.key} className={'ct:rounded-sm ct:px-3 ct:py-1.5'}>
                                <RouteName routeKey={route.key} />
                            </div>
                        ))}
                        {groups.map((group, index) => (
                            <div key={index} className={'ct:flex ct:flex-col ct:gap-0.5'}>
                                <span className={'ct:px-3 ct:pt-3 ct:pb-1 ct:text-[11px] ct:font-semibold ct:tracking-[0.08em] ct:text-muted-foreground ct:uppercase'}>
                                    {group.label || 'New group'}
                                </span>
                                {group.items.map((key) => (
                                    <div key={key} className={'ct:rounded-sm ct:px-3 ct:py-1.5'}>
                                        <RouteName routeKey={key} />
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className={'ct:mt-2 ct:border-t ct:border-border ct:px-3 ct:pt-2.5 ct:text-xs ct:text-muted-foreground'}>
                            Open Admin Area always comes last. Sections without a group stay at the top.
                        </div>
                    </div>
                </TitledGreyBox>
            </div>
        </div>
    );
}
