import { useRef, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, NamedIcon, TitledGreyBox, httpErrorToHuman, toast, useSiteSettings } from '@pterodactyl/sdk';
import { assetUrl, deleteBrand, uploadBrand, type ThemePayload, type ThemeUpdate } from '../api';

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    onChange: (draft: ThemeUpdate) => void;
    onUploaded: (payload: ThemePayload) => void;
}

const MODES: { value: ThemeUpdate['logo_mode']; label: string; description: string }[] = [
    { value: 'logo-name', label: 'Logo and name', description: 'The logo before the Panel name.' },
    { value: 'logo', label: 'Logo only', description: 'For logos that include the name.' },
    { value: 'name', label: 'Name only', description: 'The Panel name, as before.' },
];

function UploadButton({ accept, label, busy, onFile }: { accept: string; label: string; busy: boolean; onFile: (file: File) => void }) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                ref={input}
                type={'file'}
                accept={accept}
                className={'ct:hidden'}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onFile(file);
                    event.target.value = '';
                }}
            />
            <Button size={'small'} isLoading={busy} onClick={() => input.current?.click()}>
                {label}
            </Button>
        </>
    );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <TitledGreyBox title={title}>
            <p className={'ct:mb-4 ct:text-sm ct:text-muted-foreground'}>{description}</p>
            {children}
        </TitledGreyBox>
    );
}

export default function BrandingEditor({ payload, draft, onChange, onUploaded }: Props) {
    const { name } = useSiteSettings();
    const { branding, revision } = payload.config;
    const logo = branding.logo ? assetUrl('brand', branding.logo.file, revision) : null;
    const favicon = branding.favicon ? assetUrl('brand', branding.favicon.file, revision) : null;

    const run = (task: () => Promise<ThemePayload>, done: string) =>
        task()
            .then((result) => {
                onUploaded(result);
                toast.success(done);
            })
            .catch((error) => toast.error(httpErrorToHuman(error)));

    const logoUpload = useMutation({ mutationFn: (file: File) => run(() => uploadBrand('logo', file), 'Logo updated.') });
    const logoRemove = useMutation({ mutationFn: () => run(() => deleteBrand('logo'), 'Logo removed.') });
    const faviconUpload = useMutation({ mutationFn: (file: File) => run(() => uploadBrand('favicon', file), 'Favicon updated.') });
    const faviconRemove = useMutation({ mutationFn: () => run(() => deleteBrand('favicon'), 'Favicon removed.') });

    const mode = draft.logo_mode;

    return (
        <div className={'ct:flex ct:flex-col ct:gap-6'}>
            <Section title={'Logo'} description={'Shown in the header on every page and on the login page. PNG, JPG, WebP, or SVG, up to 1 MB. Uploads apply right away.'}>
                <div className={'ct:grid ct:gap-6 ct:lg:grid-cols-2'}>
                    <div className={'ct:flex ct:flex-col ct:gap-3'}>
                        <span className={'ct:text-xs ct:font-medium ct:tracking-wide ct:text-muted-foreground ct:uppercase'}>Header preview</span>
                        <div className={'ct:flex ct:h-14 ct:items-center ct:gap-2.5 ct:rounded-md ct:border ct:border-border ct:bg-background ct:px-4'}>
                            {logo && mode !== 'name' && <img src={logo} alt={''} className={'ct:h-8 ct:max-w-48 ct:object-contain'} />}
                            {(mode !== 'logo' || !logo) && <span className={'ct:font-header ct:text-xl ct:font-medium ct:text-foreground'}>{name}</span>}
                        </div>
                        <div className={'ct:flex ct:gap-2'}>
                            <UploadButton accept={'.png,.jpg,.jpeg,.webp,.svg'} label={logo ? 'Replace logo' : 'Upload logo'} busy={logoUpload.isPending} onFile={(file) => logoUpload.mutate(file)} />
                            {logo && (
                                <Button.Text size={'small'} disabled={logoRemove.isPending} onClick={() => logoRemove.mutate()}>
                                    Remove
                                </Button.Text>
                            )}
                        </div>
                    </div>
                    <div role={'radiogroup'} aria-label={'Header shows'} className={'ct:flex ct:flex-col ct:gap-2'}>
                        <span className={'ct:text-xs ct:font-medium ct:tracking-wide ct:text-muted-foreground ct:uppercase'}>Header shows</span>
                        {MODES.map((option) => (
                            <button
                                key={option.value}
                                type={'button'}
                                role={'radio'}
                                aria-checked={mode === option.value}
                                disabled={!logo && option.value !== 'name'}
                                onClick={() => onChange({ ...draft, logo_mode: option.value })}
                                className={[
                                    'ct:flex ct:items-center ct:gap-3 ct:rounded-md ct:border ct:px-3 ct:py-2 ct:text-left ct:transition-colors ct:disabled:opacity-50',
                                    mode === option.value ? 'ct:border-primary ct:bg-primary/10' : 'ct:border-border ct:bg-card ct:hover:bg-muted',
                                ].join(' ')}
                            >
                                <span className={['ct:size-3 ct:shrink-0 ct:rounded-full ct:border-2', mode === option.value ? 'ct:border-primary ct:bg-primary' : 'ct:border-muted-foreground'].join(' ')} />
                                <span className={'ct:flex ct:flex-col'}>
                                    <span className={'ct:text-sm ct:font-medium ct:text-foreground'}>{option.label}</span>
                                    <span className={'ct:text-xs ct:text-muted-foreground'}>{option.description}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            <Section title={'Favicon'} description={'The icon in browser tabs and bookmarks. PNG, ICO, or SVG, up to 512 KB; a square PNG of at least 64 pixels looks best.'}>
                <div className={'ct:flex ct:flex-wrap ct:items-center ct:gap-4'}>
                    <div className={'ct:flex ct:h-10 ct:items-center ct:gap-2 ct:rounded-t-md ct:border ct:border-b-0 ct:border-border ct:bg-muted ct:px-3 ct:text-sm ct:text-foreground'}>
                        {favicon ? <img src={favicon} alt={''} className={'ct:size-4 ct:object-contain'} /> : <NamedIcon name={'globe'} className={'ct:size-4 ct:text-muted-foreground'} />}
                        <span className={'ct:max-w-40 ct:truncate'}>{name}</span>
                    </div>
                    <UploadButton accept={'.png,.ico,.svg'} label={favicon ? 'Replace favicon' : 'Upload favicon'} busy={faviconUpload.isPending} onFile={(file) => faviconUpload.mutate(file)} />
                    {favicon && (
                        <Button.Text size={'small'} disabled={faviconRemove.isPending} onClick={() => faviconRemove.mutate()}>
                            Remove
                        </Button.Text>
                    )}
                </div>
            </Section>
        </div>
    );
}
