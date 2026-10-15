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
                'ct:flex ct:flex-col ct:gap-3 ct:rounded-md ct:border ct:p-3 ct:text-left ct:transition-colors',
                'ct:focus-visible:outline-none ct:focus-visible:ring-2 ct:focus-visible:ring-ring',
                selected ? 'ct:border-primary ct:bg-primary/10' : 'ct:border-border ct:bg-card ct:hover:bg-muted',
            ].join(' ')}
        >
            <span aria-hidden className={'ct:flex ct:h-24 ct:flex-col ct:gap-1 ct:overflow-hidden ct:rounded-sm ct:border ct:border-border ct:bg-background ct:p-1.5'}>
                {children}
            </span>
            <span className={'ct:flex ct:flex-col ct:gap-0.5'}>
                <span className={'ct:text-sm ct:font-medium ct:text-foreground'}>{label}</span>
                <span className={'ct:text-xs ct:text-muted-foreground'}>{description}</span>
            </span>
        </button>
    );
}

/** Wireframe pieces for the option previews. */
const Bar = ({ className = '' }: { className?: string }) => <span className={`ct:block ct:rounded-[2px] ct:bg-muted ${className}`} />;
const Header = () => <Bar className={'ct:h-2.5 ct:w-full ct:bg-card'} />;
const Content = ({ width }: { width: string }) => (
    <span className={`ct:mx-auto ct:flex ct:flex-1 ct:flex-col ct:gap-1 ${width}`}>
        <Bar className={'ct:h-6 ct:w-full ct:bg-card'} />
        <Bar className={'ct:h-6 ct:w-full ct:bg-card'} />
    </span>
);

export default function LayoutEditor({ payload, draft, onChange }: Props) {
    const layout = draft.layout;
    const set = (patch: Partial<LayoutConfig>) => onChange({ ...draft, layout: { ...layout, ...patch } });

    return (
        <div className={'ct:flex ct:flex-col ct:gap-6'}>
            <TitledGreyBox title={'Navigation'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>
                    How server and account pages list their sections. The administration area always uses its sidebar.
                </p>
                <div role={'radiogroup'} aria-label={'Navigation'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-2 ct:lg:max-w-2xl'}>
                    <OptionCard
                        label={'Top tabs'}
                        description={'A row of tabs under the header, like the Panel.'}
                        selected={layout.navigation === 'tabs'}
                        onSelect={() => set({ navigation: 'tabs' })}
                    >
                        <Header />
                        <span className={'ct:flex ct:gap-1'}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <Bar key={i} className={`ct:h-1.5 ct:w-5 ${i === 0 ? 'ct:bg-primary' : ''}`} />
                            ))}
                        </span>
                        <Content width={'ct:w-full'} />
                    </OptionCard>
                    <OptionCard
                        label={'Sidebar'}
                        description={'Sections in a column beside the page, on screens 1024px and wider.'}
                        selected={layout.navigation === 'side'}
                        onSelect={() => set({ navigation: 'side' })}
                    >
                        <Header />
                        <span className={'ct:flex ct:flex-1 ct:gap-1.5'}>
                            <span className={'ct:flex ct:w-1/4 ct:flex-col ct:gap-1'}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <Bar key={i} className={`ct:h-1.5 ct:w-full ${i === 0 ? 'ct:bg-primary' : ''}`} />
                                ))}
                            </span>
                            <Content width={'ct:w-full'} />
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Content width'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>The widest the header and page content grow on large screens.</p>
                <div role={'radiogroup'} aria-label={'Content width'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-3'}>
                    {([
                        ['standard', 'Standard', '1200px, the Panel default.', 'ct:w-2/3'],
                        ['wide', 'Wide', '1440px, for large monitors.', 'ct:w-5/6'],
                        ['full', 'Full width', 'Uses the whole window.', 'ct:w-full'],
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
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>How the server list on the dashboard looks.</p>
                <div role={'radiogroup'} aria-label={'Dashboard servers'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-3'}>
                    <OptionCard
                        label={'Panel'}
                        description={'The Panel’s own server rows.'}
                        selected={layout.dashboard === 'panel'}
                        onSelect={() => set({ dashboard: 'panel' })}
                    >
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={'ct:flex ct:h-5 ct:items-center ct:gap-1 ct:rounded-[2px] ct:bg-card ct:px-1'}>
                                <Bar className={'ct:h-1.5 ct:w-1/3'} />
                                <Bar className={'ct:ml-auto ct:h-1.5 ct:w-1/4'} />
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
                            <span key={i} className={'ct:flex ct:h-5 ct:items-center ct:gap-1 ct:rounded-[2px] ct:bg-card ct:px-1'}>
                                <span className={'ct:size-2.5 ct:rounded-[2px] ct:bg-primary/60'} />
                                <Bar className={'ct:h-1.5 ct:w-1/4'} />
                                <span className={'ct:h-1.5 ct:w-3 ct:rounded-full ct:bg-success/70'} />
                                <span className={'ct:ml-auto ct:flex ct:w-2/5 ct:gap-0.5'}>
                                    <Bar className={'ct:h-1 ct:flex-1 ct:bg-primary/50'} />
                                    <Bar className={'ct:h-1 ct:flex-1 ct:bg-primary/50'} />
                                    <Bar className={'ct:h-1 ct:flex-1 ct:bg-primary/50'} />
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
                        <span className={'ct:grid ct:flex-1 ct:grid-cols-3 ct:gap-1'}>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className={'ct:flex ct:flex-col ct:gap-0.5 ct:rounded-[2px] ct:bg-card ct:p-1'}>
                                    <span className={'ct:size-2 ct:rounded-[2px] ct:bg-primary/60'} />
                                    <Bar className={'ct:h-1 ct:w-2/3'} />
                                    <Bar className={'ct:mt-auto ct:h-0.5 ct:w-full ct:bg-primary/50'} />
                                </span>
                            ))}
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Server console'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>The page with the server’s terminal, power buttons, and usage.</p>
                <div role={'radiogroup'} aria-label={'Server console'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-2 ct:lg:max-w-2xl'}>
                    <OptionCard
                        label={'Panel'}
                        description={'The Panel’s own console page.'}
                        selected={layout.console === 'panel'}
                        onSelect={() => set({ console: 'panel' })}
                    >
                        <span className={'ct:flex ct:h-2.5 ct:items-center ct:justify-end ct:gap-0.5'}>
                            <Bar className={'ct:mr-auto ct:h-2 ct:w-1/4'} />
                            <span className={'ct:h-2 ct:w-3 ct:rounded-[1px] ct:bg-primary/70'} />
                            <span className={'ct:h-2 ct:w-3 ct:rounded-[1px] ct:bg-muted'} />
                            <span className={'ct:h-2 ct:w-3 ct:rounded-[1px] ct:bg-destructive/70'} />
                        </span>
                        <span className={'ct:flex ct:flex-1 ct:gap-1'}>
                            <span className={'ct:flex-[3] ct:rounded-[2px] ct:bg-terminal ct:ring-1 ct:ring-border'} />
                            <span className={'ct:flex ct:flex-1 ct:flex-col ct:gap-0.5'}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <Bar key={i} className={'ct:flex-1 ct:bg-card'} />
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
                        <span className={'ct:flex ct:h-4 ct:items-center ct:gap-1 ct:rounded-[2px] ct:bg-card ct:px-1'}>
                            <Bar className={'ct:h-1.5 ct:w-1/4 ct:bg-foreground/40'} />
                            <span className={'ct:ml-auto ct:h-1.5 ct:w-3 ct:rounded-full ct:bg-success/70'} />
                            <span className={'ct:h-2 ct:w-3 ct:rounded-full ct:bg-success'} />
                            <span className={'ct:h-2 ct:w-3 ct:rounded-full ct:bg-muted'} />
                        </span>
                        <span className={'ct:grid ct:grid-cols-5 ct:gap-0.5'}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <span key={i} className={'ct:h-2.5 ct:rounded-[2px] ct:bg-card'} />
                            ))}
                        </span>
                        <span className={'ct:flex ct:flex-1 ct:flex-col ct:overflow-hidden ct:rounded-[3px] ct:ring-1 ct:ring-border'}>
                            <span className={'ct:flex ct:h-1.5 ct:items-center ct:gap-0.5 ct:bg-card ct:px-0.5'}>
                                <span className={'ct:size-1 ct:rounded-full ct:bg-destructive'} />
                                <span className={'ct:size-1 ct:rounded-full ct:bg-warning'} />
                                <span className={'ct:size-1 ct:rounded-full ct:bg-success'} />
                            </span>
                            <span className={'ct:flex-1 ct:bg-terminal'} />
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'File manager'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>The server’s file browser.</p>
                <div role={'radiogroup'} aria-label={'File manager'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-2 ct:lg:max-w-2xl'}>
                    <OptionCard label={'Panel'} description={'The Panel’s own file list.'} selected={layout.files === 'panel'} onSelect={() => set({ files: 'panel' })}>
                        <span className={'ct:flex ct:h-2.5 ct:items-center ct:gap-0.5'}>
                            <Bar className={'ct:mr-auto ct:h-1.5 ct:w-1/3'} />
                            {[0, 1, 2].map((i) => (
                                <span key={i} className={'ct:h-2 ct:w-4 ct:rounded-[1px] ct:bg-primary/60'} />
                            ))}
                        </span>
                        {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={'ct:flex ct:h-3 ct:items-center ct:gap-1 ct:bg-card ct:px-1'}>
                                <span className={'ct:size-1.5 ct:rounded-[1px] ct:border ct:border-muted-foreground'} />
                                <Bar className={'ct:h-1 ct:w-1/4'} />
                            </span>
                        ))}
                    </OptionCard>
                    <OptionCard label={'Carbon'} description={'A folder header and a framed list with colored file icons.'} selected={layout.files === 'carbon'} onSelect={() => set({ files: 'carbon' })}>
                        <span className={'ct:flex ct:h-4 ct:items-center ct:gap-1 ct:rounded-[2px] ct:bg-card ct:px-1'}>
                            <span className={'ct:size-2.5 ct:rounded-[2px] ct:bg-primary/40'} />
                            <Bar className={'ct:h-1.5 ct:w-1/4 ct:bg-foreground/40'} />
                        </span>
                        <span className={'ct:flex ct:flex-1 ct:flex-col ct:overflow-hidden ct:rounded-[3px] ct:ring-1 ct:ring-border'}>
                            <span className={'ct:flex ct:h-2.5 ct:items-center ct:justify-end ct:gap-0.5 ct:bg-muted ct:px-1'}>
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className={'ct:h-1.5 ct:w-3 ct:rounded-full ct:bg-primary/60'} />
                                ))}
                            </span>
                            {['ct:bg-primary/50', 'ct:bg-success/50', 'ct:bg-accent/50', 'ct:bg-warning/50'].map((tone) => (
                                <span key={tone} className={'ct:flex ct:h-2.5 ct:items-center ct:gap-1 ct:border-b ct:border-border ct:bg-card ct:px-1'}>
                                    <span className={`ct:size-1.5 ct:rounded-[1px] ${tone}`} />
                                    <Bar className={'ct:h-1 ct:w-1/4'} />
                                </span>
                            ))}
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Sign-in pages'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>
                    The login, two-step verification, and password reset pages. Your logo from Branding is used.
                </p>
                <div role={'radiogroup'} aria-label={'Sign-in pages'} className={'ct:grid ct:gap-3 ct:sm:grid-cols-3'}>
                    <OptionCard label={'Panel'} description={'The Panel’s own sign-in pages.'} selected={layout.auth === 'panel'} onSelect={() => set({ auth: 'panel' })}>
                        <span className={'ct:mx-auto ct:mt-1 ct:h-1.5 ct:w-1/3 ct:rounded-[2px] ct:bg-muted'} />
                        <span className={'ct:mx-auto ct:flex ct:h-14 ct:w-4/5 ct:gap-1 ct:rounded-[3px] ct:bg-card ct:p-1'}>
                            <span className={'ct:w-1/3 ct:rounded-[2px] ct:bg-muted'} />
                            <span className={'ct:flex ct:flex-1 ct:flex-col ct:gap-1'}>
                                <Bar className={'ct:h-2 ct:w-full'} />
                                <Bar className={'ct:h-2 ct:w-full'} />
                                <span className={'ct:h-2 ct:rounded-[2px] ct:bg-primary/60'} />
                            </span>
                        </span>
                    </OptionCard>
                    <OptionCard label={'Centered'} description={'Logo, greeting, and a card in the middle.'} selected={layout.auth === 'centered'} onSelect={() => set({ auth: 'centered' })}>
                        <span className={'ct:flex ct:flex-1 ct:flex-col ct:items-center ct:gap-1 ct:rounded-[3px] ct:bg-gradient-to-b ct:from-muted/60 ct:to-transparent ct:pt-1'}>
                            <span className={'ct:size-2.5 ct:rounded-full ct:bg-primary/70'} />
                            <Bar className={'ct:h-1.5 ct:w-1/3 ct:bg-foreground/40'} />
                            <span className={'ct:flex ct:w-2/5 ct:flex-col ct:gap-1 ct:rounded-[4px] ct:bg-card ct:p-1'}>
                                <Bar className={'ct:h-1.5 ct:w-full'} />
                                <Bar className={'ct:h-1.5 ct:w-full'} />
                                <span className={'ct:h-1.5 ct:rounded-[2px] ct:bg-primary/60'} />
                            </span>
                        </span>
                    </OptionCard>
                    <OptionCard label={'Split'} description={'A brand panel beside the form.'} selected={layout.auth === 'split'} onSelect={() => set({ auth: 'split' })}>
                        <span className={'ct:flex ct:flex-1 ct:gap-1'}>
                            <span className={'ct:flex ct:w-2/5 ct:flex-col ct:justify-between ct:rounded-[4px] ct:bg-card ct:p-1'}>
                                <Bar className={'ct:h-1.5 ct:w-2/3 ct:bg-foreground/40'} />
                                <span className={'ct:ml-auto ct:size-5 ct:rounded-full ct:border ct:border-foreground/20'} />
                            </span>
                            <span className={'ct:flex ct:flex-1 ct:flex-col ct:items-center ct:justify-center ct:gap-1'}>
                                <Bar className={'ct:h-1.5 ct:w-1/2 ct:bg-foreground/40'} />
                                <span className={'ct:flex ct:w-3/4 ct:flex-col ct:gap-1 ct:rounded-[4px] ct:bg-card ct:p-1'}>
                                    <Bar className={'ct:h-1.5 ct:w-full'} />
                                    <span className={'ct:h-1.5 ct:rounded-[2px] ct:bg-primary/60'} />
                                </span>
                            </span>
                        </span>
                    </OptionCard>
                </div>
            </TitledGreyBox>

            <TitledGreyBox title={'Notifications'}>
                <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>The style of the pop-up messages in the top-right corner.</p>
                <div className={'ct:flex ct:flex-col ct:gap-4 ct:sm:flex-row ct:sm:items-stretch'}>
                    <div role={'radiogroup'} aria-label={'Notifications'} className={'ct:grid ct:flex-1 ct:gap-3 ct:sm:grid-cols-2 ct:lg:max-w-2xl'}>
                        <OptionCard label={'Panel'} description={'The Panel’s own notifications.'} selected={layout.toasts === 'panel'} onSelect={() => set({ toasts: 'panel' })}>
                            <span className={'ct:mt-auto ct:ml-auto ct:flex ct:h-7 ct:w-3/4 ct:items-center ct:gap-1 ct:rounded-[2px] ct:border ct:border-success/50 ct:bg-popover ct:px-1.5'}>
                                <span className={'ct:size-2 ct:rounded-full ct:border ct:border-success'} />
                                <Bar className={'ct:h-1.5 ct:w-1/2'} />
                            </span>
                        </OptionCard>
                        <OptionCard label={'Carbon'} description={'A colored edge and a tinted icon.'} selected={layout.toasts === 'carbon'} onSelect={() => set({ toasts: 'carbon' })}>
                            <span className={'ct:mt-auto ct:ml-auto ct:flex ct:h-7 ct:w-3/4 ct:items-center ct:gap-1 ct:rounded-md ct:border ct:border-l-[3px] ct:border-border ct:border-l-success ct:bg-popover ct:px-1.5'}>
                                <span className={'ct:size-3.5 ct:rounded-full ct:bg-success/25'} />
                                <Bar className={'ct:h-1.5 ct:w-1/2'} />
                            </span>
                        </OptionCard>
                    </div>
                    <div className={'ct:flex ct:items-end'}>
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
                <div className={'ct:flex ct:flex-col ct:gap-4'}>
                    <div className={'ct:flex ct:items-center ct:gap-4'}>
                        <Label htmlFor={'ct-sidebar'} className={'ct:shrink-0'}>
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
                            className={'ct:flex-1 ct:accent-primary'}
                        />
                        <span className={'ct:w-24 ct:text-right ct:font-mono ct:text-xs ct:text-muted-foreground'}>
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
