import { useEffect, useState } from 'react';
import { Alert, Button, Input, Label, TitledGreyBox } from '@pterodactyl/sdk';
import type { Preset, ThemePayload, ThemeUpdate, TokenInfo } from '../api';

const GROUPS: { id: TokenInfo['group']; title: string }[] = [
    { id: 'surfaces', title: 'Surfaces' },
    { id: 'text', title: 'Text' },
    { id: 'brand', title: 'Brand' },
    { id: 'lines', title: 'Lines' },
    { id: 'status', title: 'Status' },
];

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
const SWATCHES = ['background', 'card', 'muted', 'primary', 'accent', 'foreground'];

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    onChange: (draft: ThemeUpdate) => void;
}

function PresetCard({ name, description, colors, selected, onSelect }: {
    name: string;
    description: string;
    colors?: Record<string, string>;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type={'button'}
            role={'radio'}
            aria-checked={selected}
            onClick={onSelect}
            className={[
                'ct:flex ct:flex-col ct:gap-3 ct:rounded-md ct:border ct:p-3 ct:text-left ct:transition-colors',
                'ct:focus-visible:outline-none ct:focus-visible:ring-2 ct:focus-visible:ring-ring',
                selected ? 'ct:border-primary ct:bg-primary/10' : 'ct:border-border ct:bg-card ct:hover:bg-muted',
            ].join(' ')}
        >
            <span className={'ct:flex ct:h-8 ct:overflow-hidden ct:rounded-sm ct:border ct:border-border'}>
                {colors ? (
                    SWATCHES.map((token) => (
                        <span key={token} className={'ct:flex-1'} style={{ backgroundColor: colors[token] }} />
                    ))
                ) : (
                    <span className={'ct:flex ct:flex-1 ct:items-center ct:justify-center ct:text-xs ct:text-muted-foreground'}>
                        Panel colors
                    </span>
                )}
            </span>
            <span className={'ct:flex ct:flex-col ct:gap-0.5'}>
                <span className={'ct:text-sm ct:font-medium ct:text-foreground'}>{name}</span>
                <span className={'ct:text-xs ct:text-muted-foreground'}>{description}</span>
            </span>
        </button>
    );
}

function ColorField({ token, label, value, onChange }: { token: string; label: string; value: string; onChange: (value: string) => void }) {
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);
    const id = `ct-color-${token}`;

    return (
        <div className={'ct:flex ct:items-center ct:gap-3'}>
            <input
                type={'color'}
                aria-label={`${label} color`}
                value={value.slice(0, 7)}
                onChange={(event) => onChange(event.target.value + value.slice(7))}
                className={'ct:size-9 ct:shrink-0 ct:cursor-pointer ct:rounded-md ct:border ct:border-border ct:bg-transparent ct:p-0.5'}
            />
            <div className={'ct:flex ct:min-w-0 ct:flex-1 ct:flex-col ct:gap-1'}>
                <Label htmlFor={id} className={'ct:truncate'}>
                    {label}
                </Label>
                <Input
                    id={id}
                    value={text}
                    spellCheck={false}
                    maxLength={9}
                    $hasError={!HEX.test(text)}
                    className={'ct:font-mono ct:text-xs'}
                    onChange={(event) => {
                        const next = event.target.value.trim();
                        setText(next);
                        if (HEX.test(next)) onChange(next.toLowerCase());
                    }}
                    onBlur={() => setText(value)}
                />
            </div>
        </div>
    );
}

function Preview() {
    return (
        <div className={'ct:flex ct:flex-col ct:gap-4'}>
            <Alert type={'success'} title={'Server installed'}>
                Your server is ready to start.
            </Alert>
            <Alert type={'warning'}>Disk usage is above 90%.</Alert>
            <div className={'ct:flex ct:flex-col ct:gap-2'}>
                <Label htmlFor={'ct-preview-input'}>Server name</Label>
                <Input id={'ct-preview-input'} defaultValue={'Survival'} />
            </div>
            <p className={'ct:text-sm ct:text-muted-foreground'}>
                Secondary text and <a className={'ct:text-accent ct:hover:underline'} href={'#'} onClick={(e) => e.preventDefault()}>a link</a>.
            </p>
            <div className={'ct:flex ct:flex-wrap ct:gap-2'}>
                <Button>Primary</Button>
                <Button isSecondary>Secondary</Button>
                <Button.Danger>Delete</Button.Danger>
            </div>
        </div>
    );
}

export default function PaletteEditor({ payload, draft, onChange }: Props) {
    const custom = draft.preset === 'custom';
    const usesPanelColors = draft.preset === 'none';

    const choosePreset = (id: string) => {
        if (id === 'none') {
            onChange({ ...draft, preset: 'none' });
            return;
        }
        const preset: Preset = payload.presets[id];
        onChange({ ...draft, preset: id, colors: { ...preset.colors }, radius: preset.radius });
    };

    const setColor = (token: string, value: string) =>
        onChange({ ...draft, preset: 'custom', colors: { ...draft.colors, [token]: value } });

    const radius = draft.radius ?? 0.5;

    return (
        <div className={'ct:grid ct:items-start ct:gap-6 ct:xl:grid-cols-3'}>
            <div className={'ct:flex ct:flex-col ct:gap-6 ct:xl:col-span-2'}>
                <TitledGreyBox title={'Palette'}>
                    <div role={'radiogroup'} aria-label={'Palette'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-2 ct:lg:grid-cols-4'}>
                        {Object.entries(payload.presets).map(([id, preset]) => (
                            <PresetCard
                                key={id}
                                name={preset.name}
                                description={preset.description}
                                colors={preset.colors}
                                selected={draft.preset === id}
                                onSelect={() => choosePreset(id)}
                            />
                        ))}
                        <PresetCard
                            name={'Custom'}
                            description={custom ? 'Your own colors.' : 'Change any color below.'}
                            colors={draft.colors}
                            selected={custom}
                            onSelect={() => onChange({ ...draft, preset: 'custom' })}
                        />
                        <PresetCard
                            name={'Panel default'}
                            description={'Keep the Panel\'s own colors.'}
                            selected={usesPanelColors}
                            onSelect={() => choosePreset('none')}
                        />
                    </div>
                </TitledGreyBox>

                {usesPanelColors ? (
                    <Alert type={'info'}>The Panel&apos;s own colors are used. Layout, fonts, branding, and icons still apply.</Alert>
                ) : (
                    <TitledGreyBox title={'Colors'}>
                        <div className={'ct:flex ct:flex-col ct:gap-6'}>
                            {GROUPS.map((group) => (
                                <section key={group.id} className={'ct:flex ct:flex-col ct:gap-3'}>
                                    <h3 className={'ct:text-xs ct:font-medium ct:tracking-wide ct:text-muted-foreground ct:uppercase'}>
                                        {group.title}
                                    </h3>
                                    <div className={'ct:grid ct:gap-4 ct:sm:grid-cols-2'}>
                                        {payload.tokens
                                            .filter((token) => token.group === group.id)
                                            .map((token) => (
                                                <ColorField
                                                    key={token.token}
                                                    token={token.token}
                                                    label={token.label}
                                                    value={draft.colors[token.token] ?? '#000000'}
                                                    onChange={(value) => setColor(token.token, value)}
                                                />
                                            ))}
                                    </div>
                                </section>
                            ))}
                            <section className={'ct:flex ct:flex-col ct:gap-3'}>
                                <h3 className={'ct:text-xs ct:font-medium ct:tracking-wide ct:text-muted-foreground ct:uppercase'}>
                                    Shape
                                </h3>
                                <div className={'ct:flex ct:items-center ct:gap-4'}>
                                    <Label htmlFor={'ct-radius'} className={'ct:shrink-0'}>
                                        Corner radius
                                    </Label>
                                    <input
                                        id={'ct-radius'}
                                        type={'range'}
                                        min={payload.radius.min}
                                        max={payload.radius.max}
                                        step={0.125}
                                        value={radius}
                                        onChange={(event) => onChange({ ...draft, preset: draft.preset === 'none' ? 'none' : 'custom', radius: Number(event.target.value) })}
                                        className={'ct:flex-1 ct:accent-primary'}
                                    />
                                    <span className={'ct:w-16 ct:text-right ct:font-mono ct:text-xs ct:text-muted-foreground'}>
                                        {radius}rem
                                    </span>
                                </div>
                            </section>
                        </div>
                    </TitledGreyBox>
                )}
            </div>

            <TitledGreyBox title={'Preview'}>
                <Preview />
            </TitledGreyBox>
        </div>
    );
}
