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
                className={'hidden'}
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
            <p className={'mb-4 text-sm text-muted-foreground'}>{description}</p>
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
        <div className={'flex flex-col gap-6'}>
            <Section title={'Logo'} description={'Shown in the header on every page and on the login page. PNG, JPG, WebP, or SVG, up to 1 MB. Uploads apply right away.'}>
                <div className={'grid gap-6 lg:grid-cols-2'}>
                    <div className={'flex flex-col gap-3'}>
                        <span className={'text-xs font-medium tracking-wide text-muted-foreground uppercase'}>Header preview</span>
                        <div className={'flex h-14 items-center gap-2.5 rounded-md border border-border bg-background px-4'}>
                            {logo && mode !== 'name' && <img src={logo} alt={''} className={'h-8 max-w-48 object-contain'} />}
                            {(mode !== 'logo' || !logo) && <span className={'font-header text-xl font-medium text-foreground'}>{name}</span>}
                        </div>
                        <div className={'flex gap-2'}>
                            <UploadButton accept={'.png,.jpg,.jpeg,.webp,.svg'} label={logo ? 'Replace logo' : 'Upload logo'} busy={logoUpload.isPending} onFile={(file) => logoUpload.mutate(file)} />
                            {logo && (
                                <Button.Text size={'small'} disabled={logoRemove.isPending} onClick={() => logoRemove.mutate()}>
                                    Remove
                                </Button.Text>
                            )}
                        </div>
                    </div>
                    <div role={'radiogroup'} aria-label={'Header shows'} className={'flex flex-col gap-2'}>
                        <span className={'text-xs font-medium tracking-wide text-muted-foreground uppercase'}>Header shows</span>
                        {MODES.map((option) => (
                            <button
                                key={option.value}
                                type={'button'}
                                role={'radio'}
                                aria-checked={mode === option.value}
                                disabled={!logo && option.value !== 'name'}
                                onClick={() => onChange({ ...draft, logo_mode: option.value })}
                                className={[
                                    'flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50',
                                    mode === option.value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted',
                                ].join(' ')}
                            >
                                <span className={['size-3 shrink-0 rounded-full border-2', mode === option.value ? 'border-primary bg-primary' : 'border-muted-foreground'].join(' ')} />
                                <span className={'flex flex-col'}>
                                    <span className={'text-sm font-medium text-foreground'}>{option.label}</span>
                                    <span className={'text-xs text-muted-foreground'}>{option.description}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            <Section title={'Favicon'} description={'The icon in browser tabs and bookmarks. PNG, ICO, or SVG, up to 512 KB; a square PNG of at least 64 pixels looks best.'}>
                <div className={'flex flex-wrap items-center gap-4'}>
                    <div className={'flex h-10 items-center gap-2 rounded-t-md border border-b-0 border-border bg-muted px-3 text-sm text-foreground'}>
                        {favicon ? <img src={favicon} alt={''} className={'size-4 object-contain'} /> : <NamedIcon name={'globe'} className={'size-4 text-muted-foreground'} />}
                        <span className={'max-w-40 truncate'}>{name}</span>
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
