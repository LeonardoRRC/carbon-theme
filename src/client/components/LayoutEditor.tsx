import type { ReactNode } from 'react';
import { Alert, Button, Label, TitledGreyBox, toast } from '@pterodactyl/sdk';
import type { LayoutConfig, ThemePayload, ThemeUpdate } from '../api';

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    onChange: (draft: ThemeUpdate) => void;
}

function OptionCard({ label, description, selected, onSelect, children }: {
    label: string;
    description: string;
    selected: boolean;
    onSelect: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type={'button'}
            role={'radio'}
            aria-checked={selected}
            onClick={onSelect}
            className={[
                'flex flex-col gap-3 rounded-md border p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted',
            ].join(' ')}
        >
            <span aria-hidden className={'flex h-24 flex-col gap-1 overflow-hidden rounded-sm border border-border bg-background p-1.5'}>
                {children}
            </span>
            <span className={'flex flex-col gap-0.5'}>
                <span className={'text-sm font-medium text-foreground'}>{label}</span>
                <span className={'text-xs text-muted-foreground'}>{description}</span>
            </span>
        </button>
    );
}

/** Wireframe pieces for the option previews. */
const Bar = ({ className = '' }: { className?: string }) => <span className={`block rounded-[2px] bg-muted ${className}`} />;
const Header = () => <Bar className={'h-2.5 w-full bg-card'} />;
const Content = ({ width }: { width: string }) => (
    <span className={`mx-auto flex flex-1 flex-col gap-1 ${width}`}>
        <Bar className={'h-6 w-full bg-card'} />
        <Bar className={'h-6 w-full bg-card'} />
    </span>
);

export default function LayoutEditor({ payload, draft, onChange }: Props) {
    const layout = draft.layout;
    const set = (patch: Partial<LayoutConfig>) => onChange({ ...draft, layout: { ...layout, ...patch } });

    return (
        <div className={'flex flex-col gap-6'}>
            <TitledGreyBox title={'Navigation'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>
                    How server and account pages list their sections. The administration area always uses its sidebar.
                </p>
                <div role={'radiogroup'} aria-label={'Navigation'} className={'grid gap-3 sm:grid-cols-2 lg:max-w-2xl'}>
                    <OptionCard
                        label={'Top tabs'}
                        description={'A row of tabs under the header, like the Panel.'}
                        selected={layout.navigation === 'tabs'}
                        onSelect={() => set({ navigation: 'tabs' })}
                    >
                        <Header />
                        <span className={'flex gap-1'}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <Bar key={i} className={`h-1.5 w-5 ${i === 0 ? 'bg-primary' : ''}`} />
                            ))}
                        </span>
                        <Content width={'w-full'} />
                    </OptionCard>
                    <OptionCard
                        label={'Sidebar'}
                        description={'Sections in a column beside the page, on screens 1024px and wider.'}
                        selected={layout.navigation === 'side'}
                        onSelect={() => set({ navigation: 'side' })}
                    >
                        <Header />
                        <span className={'flex flex-1 gap-1.5'}>
                            <span className={'flex w-1/4 flex-col gap-1'}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <Bar key={i} className={`h-1.5 w-full ${i === 0 ? 'bg-primary' : ''}`} />
                                ))}
                            </span>
                            <Content width={'w-full'} />
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Content width'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>The widest the header and page content grow on large screens.</p>
                <div role={'radiogroup'} aria-label={'Content width'} className={'grid gap-3 sm:grid-cols-3'}>
                    {([
                        ['standard', 'Standard', '1200px, the Panel default.', 'w-2/3'],
                        ['wide', 'Wide', '1440px, for large monitors.', 'w-5/6'],
                        ['full', 'Full width', 'Uses the whole window.', 'w-full'],
                    ] as const).map(([value, label, description, width]) => (
                        <OptionCard
                            key={value}
                            label={label}
                            description={description}
                            selected={layout.content_width === value}
                            onSelect={() => set({ content_width: value })}
                        >
                            <Header />
                            <Content width={width} />
                        </OptionCard>
                    ))}
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Dashboard servers'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>How the server list on the dashboard looks.</p>
                <div role={'radiogroup'} aria-label={'Dashboard servers'} className={'grid gap-3 sm:grid-cols-3'}>
                    <OptionCard
                        label={'Panel'}
                        description={'The Panel’s own server rows.'}
                        selected={layout.dashboard === 'panel'}
                        onSelect={() => set({ dashboard: 'panel' })}
                    >
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={'flex h-5 items-center gap-1 rounded-[2px] bg-card px-1'}>
                                <Bar className={'h-1.5 w-1/3'} />
                                <Bar className={'ml-auto h-1.5 w-1/4'} />
                            </span>
                        ))}
                    </OptionCard>
                    <OptionCard
                        label={'Rows'}
                        description={'Status, address, and usage bars on one line.'}
                        selected={layout.dashboard === 'rows'}
                        onSelect={() => set({ dashboard: 'rows' })}
                    >
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={'flex h-5 items-center gap-1 rounded-[2px] bg-card px-1'}>
                                <span className={'size-2.5 rounded-[2px] bg-primary/60'} />
                                <Bar className={'h-1.5 w-1/4'} />
                                <span className={'h-1.5 w-3 rounded-full bg-success/70'} />
                                <span className={'ml-auto flex w-2/5 gap-0.5'}>
                                    <Bar className={'h-1 flex-1 bg-primary/50'} />
                                    <Bar className={'h-1 flex-1 bg-primary/50'} />
                                    <Bar className={'h-1 flex-1 bg-primary/50'} />
                                </span>
                            </span>
                        ))}
                    </OptionCard>
                    <OptionCard
                        label={'Cards'}
                        description={'A grid of cards with usage bars.'}
                        selected={layout.dashboard === 'cards'}
                        onSelect={() => set({ dashboard: 'cards' })}
                    >
                        <span className={'grid flex-1 grid-cols-3 gap-1'}>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className={'flex flex-col gap-0.5 rounded-[2px] bg-card p-1'}>
                                    <span className={'size-2 rounded-[2px] bg-primary/60'} />
                                    <Bar className={'h-1 w-2/3'} />
                                    <Bar className={'mt-auto h-0.5 w-full bg-primary/50'} />
                                </span>
                            ))}
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Server console'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>The page with the server’s terminal, power buttons, and usage.</p>
                <div role={'radiogroup'} aria-label={'Server console'} className={'grid gap-3 sm:grid-cols-3 lg:max-w-3xl'}>
                    <OptionCard
                        label={'Panel'}
                        description={'The Panel’s own console page.'}
                        selected={layout.console === 'panel'}
                        onSelect={() => set({ console: 'panel' })}
                    >
                        <span className={'flex h-2.5 items-center justify-end gap-0.5'}>
                            <Bar className={'mr-auto h-2 w-1/4'} />
                            <span className={'h-2 w-3 rounded-[1px] bg-primary/70'} />
                            <span className={'h-2 w-3 rounded-[1px] bg-muted'} />
                            <span className={'h-2 w-3 rounded-[1px] bg-destructive/70'} />
                        </span>
                        <span className={'flex flex-1 gap-1'}>
                            <span className={'flex-[3] rounded-[2px] bg-terminal ring-1 ring-border'} />
                            <span className={'flex flex-1 flex-col gap-0.5'}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <Bar key={i} className={'flex-1 bg-card'} />
                                ))}
                            </span>
                        </span>
                    </OptionCard>
                    <OptionCard
                        label={'Carbon'}
                        description={'A header card with live status, usage tiles, and a framed terminal.'}
                        selected={layout.console === 'carbon'}
                        onSelect={() => set({ console: 'carbon' })}
                    >
                        <span className={'flex h-4 items-center gap-1 rounded-[2px] bg-card px-1'}>
                            <Bar className={'h-1.5 w-1/4 bg-foreground/40'} />
                            <span className={'ml-auto h-1.5 w-3 rounded-full bg-success/70'} />
                            <span className={'h-2 w-3 rounded-full bg-success'} />
                            <span className={'h-2 w-3 rounded-full bg-muted'} />
                        </span>
                        <span className={'grid grid-cols-5 gap-0.5'}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <span key={i} className={'h-2.5 rounded-[2px] bg-card'} />
                            ))}
                        </span>
                        <span className={'flex flex-1 flex-col overflow-hidden rounded-[3px] ring-1 ring-border'}>
                            <span className={'flex h-1.5 items-center gap-0.5 bg-card px-0.5'}>
                                <span className={'size-1 rounded-full bg-destructive'} />
                                <span className={'size-1 rounded-full bg-warning'} />
                                <span className={'size-1 rounded-full bg-success'} />
                            </span>
                            <span className={'flex-1 bg-terminal'} />
                        </span>
                    </OptionCard>
                    <OptionCard
                        label={'Blocks'}
                        description={'Titled stat blocks in a row, a full-width terminal, and titled charts.'}
                        selected={layout.console === 'blocks'}
                        onSelect={() => set({ console: 'blocks' })}
                    >
                        <span className={'grid grid-cols-6 gap-0.5'}>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className={'flex flex-col overflow-hidden rounded-[2px] bg-card'}>
                                    <span className={'h-1 bg-primary'} />
                                    <span className={'h-1.5'} />
                                </span>
                            ))}
                        </span>
                        <span className={'flex-1 rounded-[2px] bg-terminal ring-1 ring-border'} />
                        <span className={'grid grid-cols-3 gap-0.5'}>
                            {[0, 1, 2].map((i) => (
                                <span key={i} className={'flex flex-col overflow-hidden rounded-[2px] bg-card'}>
                                    <span className={'h-1 bg-primary'} />
                                    <span className={'h-2.5'} />
                                </span>
                            ))}
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'File manager'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>The server’s file browser.</p>
                <div role={'radiogroup'} aria-label={'File manager'} className={'grid gap-3 sm:grid-cols-2 lg:max-w-2xl'}>
                    <OptionCard label={'Panel'} description={'The Panel’s own file list.'} selected={layout.files === 'panel'} onSelect={() => set({ files: 'panel' })}>
                        <span className={'flex h-2.5 items-center gap-0.5'}>
                            <Bar className={'mr-auto h-1.5 w-1/3'} />
                            {[0, 1, 2].map((i) => (
                                <span key={i} className={'h-2 w-4 rounded-[1px] bg-primary/60'} />
                            ))}
                        </span>
                        {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={'flex h-3 items-center gap-1 bg-card px-1'}>
                                <span className={'size-1.5 rounded-[1px] border border-muted-foreground'} />
                                <Bar className={'h-1 w-1/4'} />
                            </span>
                        ))}
                    </OptionCard>
                    <OptionCard label={'Carbon'} description={'A folder header and a framed list with colored file icons.'} selected={layout.files === 'carbon'} onSelect={() => set({ files: 'carbon' })}>
                        <span className={'flex h-4 items-center gap-1 rounded-[2px] bg-card px-1'}>
                            <span className={'size-2.5 rounded-[2px] bg-primary/40'} />
                            <Bar className={'h-1.5 w-1/4 bg-foreground/40'} />
                        </span>
                        <span className={'flex flex-1 flex-col overflow-hidden rounded-[3px] ring-1 ring-border'}>
                            <span className={'flex h-2.5 items-center justify-end gap-0.5 bg-muted px-1'}>
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className={'h-1.5 w-3 rounded-full bg-primary/60'} />
                                ))}
                            </span>
                            {['bg-primary/50', 'bg-success/50', 'bg-accent/50', 'bg-warning/50'].map((tone) => (
                                <span key={tone} className={'flex h-2.5 items-center gap-1 border-b border-border bg-card px-1'}>
                                    <span className={`size-1.5 rounded-[1px] ${tone}`} />
                                    <Bar className={'h-1 w-1/4'} />
                                </span>
                            ))}
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Sign-in pages'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>
                    The login, two-step verification, and password reset pages. Your logo from Branding is used.
                </p>
                <div role={'radiogroup'} aria-label={'Sign-in pages'} className={'grid gap-3 sm:grid-cols-3'}>
                    <OptionCard label={'Panel'} description={'The Panel’s own sign-in pages.'} selected={layout.auth === 'panel'} onSelect={() => set({ auth: 'panel' })}>
                        <span className={'mx-auto mt-1 h-1.5 w-1/3 rounded-[2px] bg-muted'} />
                        <span className={'mx-auto flex h-14 w-4/5 gap-1 rounded-[3px] bg-card p-1'}>
                            <span className={'w-1/3 rounded-[2px] bg-muted'} />
                            <span className={'flex flex-1 flex-col gap-1'}>
                                <Bar className={'h-2 w-full'} />
                                <Bar className={'h-2 w-full'} />
                                <span className={'h-2 rounded-[2px] bg-primary/60'} />
                            </span>
                        </span>
                    </OptionCard>
                    <OptionCard label={'Centered'} description={'Logo, greeting, and a card in the middle.'} selected={layout.auth === 'centered'} onSelect={() => set({ auth: 'centered' })}>
                        <span className={'flex flex-1 flex-col items-center gap-1 rounded-[3px] bg-gradient-to-b from-muted/60 to-transparent pt-1'}>
                            <span className={'size-2.5 rounded-full bg-primary/70'} />
                            <Bar className={'h-1.5 w-1/3 bg-foreground/40'} />
                            <span className={'flex w-2/5 flex-col gap-1 rounded-[4px] bg-card p-1'}>
                                <Bar className={'h-1.5 w-full'} />
                                <Bar className={'h-1.5 w-full'} />
                                <span className={'h-1.5 rounded-[2px] bg-primary/60'} />
                            </span>
                        </span>
                    </OptionCard>
                    <OptionCard label={'Split'} description={'A brand panel beside the form.'} selected={layout.auth === 'split'} onSelect={() => set({ auth: 'split' })}>
                        <span className={'flex flex-1 gap-1'}>
                            <span className={'flex w-2/5 flex-col justify-between rounded-[4px] bg-card p-1'}>
                                <Bar className={'h-1.5 w-2/3 bg-foreground/40'} />
                                <span className={'ml-auto size-5 rounded-full border border-foreground/20'} />
                            </span>
                            <span className={'flex flex-1 flex-col items-center justify-center gap-1'}>
                                <Bar className={'h-1.5 w-1/2 bg-foreground/40'} />
                                <span className={'flex w-3/4 flex-col gap-1 rounded-[4px] bg-card p-1'}>
                                    <Bar className={'h-1.5 w-full'} />
                                    <span className={'h-1.5 rounded-[2px] bg-primary/60'} />
                                </span>
                            </span>
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Notifications'}>
                <p className={'mb-4 text-sm text-muted-foreground'}>The style of the pop-up messages in the top-right corner.</p>
                <div className={'flex flex-col gap-4 sm:flex-row sm:items-stretch'}>
                    <div role={'radiogroup'} aria-label={'Notifications'} className={'grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl'}>
                        <OptionCard label={'Panel'} description={'The Panel’s own notifications.'} selected={layout.toasts === 'panel'} onSelect={() => set({ toasts: 'panel' })}>
                            <span className={'mt-auto ml-auto flex h-7 w-3/4 items-center gap-1 rounded-[2px] border border-success/50 bg-popover px-1.5'}>
                                <span className={'size-2 rounded-full border border-success'} />
                                <Bar className={'h-1.5 w-1/2'} />
                            </span>
                        </OptionCard>
                        <OptionCard label={'Carbon'} description={'A colored edge and a tinted icon.'} selected={layout.toasts === 'carbon'} onSelect={() => set({ toasts: 'carbon' })}>
                            <span className={'mt-auto ml-auto flex h-7 w-3/4 items-center gap-1 rounded-md border border-l-[3px] border-border border-l-success bg-popover px-1.5'}>
                                <span className={'size-3.5 rounded-full bg-success/25'} />
                                <Bar className={'h-1.5 w-1/2'} />
                            </span>
                        </OptionCard>
                    </div>
                    <div className={'flex items-end'}>
                        <Button
                            isSecondary
                            onClick={() => {
                                toast.success('Server started.');
                                setTimeout(() => toast.error('Could not connect to the node.'), 250);
                                setTimeout(() => toast.info('A backup is running.'), 500);
                            }}
                        >
                            Show examples
                        </Button>
                    </div>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Sidebar width'}>
                <div className={'flex flex-col gap-4'}>
                    <div className={'flex items-center gap-4'}>
                        <Label htmlFor={'ct-sidebar'} className={'shrink-0'}>
                            Width
                        </Label>
                        <input
                            id={'ct-sidebar'}
                            type={'range'}
                            min={payload.sidebar.min}
                            max={payload.sidebar.max}
                            step={0.5}
                            value={layout.sidebar_width}
                            onChange={(event) => set({ sidebar_width: Number(event.target.value) })}
                            className={'flex-1 accent-primary'}
                        />
                        <span className={'w-24 text-right font-mono text-xs text-muted-foreground'}>
                            {layout.sidebar_width}rem · {Math.round(layout.sidebar_width * 16)}px
                        </span>
                    </div>
                    <Alert type={'info'}>
                        Applies to the administration sidebar{layout.navigation === 'side' ? ' and the server and account sidebar' : ''}.
                    </Alert>
                </div>
            </TitledGreyBox>
        </div>
    );
}
