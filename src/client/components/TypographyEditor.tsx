import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Label, Select, Table, TitledGreyBox, httpErrorToHuman, toast } from '@pterodactyl/sdk';
import { deleteFont, uploadFont, type FontRef, type FontType, type ThemePayload, type ThemeUpdate } from '../api';
import { fontStack, loadFontForPreview } from '../fonts';

interface Props {
    payload: ThemePayload;
    draft: ThemeUpdate;
    onChange: (draft: ThemeUpdate) => void;
    onUploaded: (payload: ThemePayload) => void;
}

const SOURCES: { value: FontType; label: string; description: string }[] = [
    { value: 'panel', label: 'Panel default', description: 'IBM Plex Sans.' },
    { value: 'google', label: 'Google Fonts', description: 'Any family from fonts.google.com.' },
    { value: 'system', label: 'Installed font', description: 'A font installed on each visitor’s device.' },
    { value: 'custom', label: 'Uploaded font', description: 'Font files you upload below.' },
];

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function FontField({ role, font, payload, onChange }: { role: 'body' | 'heading'; font: FontRef; payload: ThemePayload; onChange: (font: FontRef) => void }) {
    const uploaded = [...new Set(payload.config.custom_fonts.map((f) => f.family))];
    const [name, setName] = useState(font.family ?? '');
    useEffect(() => setName(font.family ?? ''), [font.family, font.type]);

    return (
        <div className={'flex flex-col gap-4'}>
            <div role={'radiogroup'} aria-label={`${role} font source`} className={'grid gap-2 sm:grid-cols-2'}>
                {SOURCES.map((source) => {
                    const selected = font.type === source.value;
                    const disabled = source.value === 'custom' && uploaded.length === 0;
                    return (
                        <button
                            key={source.value}
                            type={'button'}
                            role={'radio'}
                            aria-checked={selected}
                            disabled={disabled}
                            onClick={() => onChange(source.value === 'panel' ? { type: 'panel' } : { type: source.value, family: source.value === 'custom' ? uploaded[0] : font.type === source.value ? font.family : source.value === 'google' ? 'Inter' : '' })}
                            className={[
                                'flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50',
                                selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted',
                            ].join(' ')}
                        >
                            <span className={'text-sm font-medium text-foreground'}>{source.label}</span>
                            <span className={'text-xs text-muted-foreground'}>{source.description}</span>
                        </button>
                    );
                })}
            </div>

            {font.type === 'google' && (
                <div className={'flex flex-col gap-2'}>
                    <div className={'flex flex-wrap gap-1.5'}>
                        {payload.google_fonts.map((family) => (
                            <button
                                key={family}
                                type={'button'}
                                onClick={() => onChange({ type: 'google', family })}
                                style={{ fontFamily: `'${family}', system-ui` }}
                                onMouseEnter={() => loadFontForPreview({ type: 'google', family }, [], 0)}
                                className={[
                                    'rounded-full border px-3 py-1 text-sm transition-colors',
                                    font.family === family ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                                ].join(' ')}
                            >
                                {family}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(font.type === 'google' || font.type === 'system') && (
                <div className={'flex flex-col gap-2'}>
                    <Label htmlFor={`ct-font-${role}`}>{font.type === 'google' ? 'Or type any Google Fonts family' : 'Font name'}</Label>
                    <Input
                        id={`ct-font-${role}`}
                        value={name}
                        placeholder={font.type === 'google' ? 'Fira Sans' : 'Segoe UI'}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() => name.trim() && onChange({ type: font.type, family: name.trim() })}
                        onKeyDown={(event) => event.key === 'Enter' && name.trim() && onChange({ type: font.type, family: name.trim() })}
                    />
                </div>
            )}

            {font.type === 'custom' && (
                <div className={'flex flex-col gap-2'}>
                    <Label htmlFor={`ct-font-${role}`}>Uploaded family</Label>
                    <Select
                        id={`ct-font-${role}`}
                        value={font.family ?? null}
                        options={uploaded.map((family) => ({ value: family, label: family }))}
                        onChange={(value) => onChange({ type: 'custom', family: String(value) })}
                    />
                </div>
            )}
        </div>
    );
}

function UploadedFonts({ payload, onUploaded }: { payload: ThemePayload; onUploaded: (payload: ThemePayload) => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [family, setFamily] = useState('');
    const [weight, setWeight] = useState(400);
    const [style, setStyle] = useState<'normal' | 'italic'>('normal');
    const fonts = payload.config.custom_fonts;

    const upload = useMutation({
        mutationFn: () => uploadFont(file!, family.trim(), weight, style),
        onSuccess: (result) => {
            onUploaded(result);
            setFile(null);
            toast.success('Font uploaded.');
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });
    const remove = useMutation({
        mutationFn: (id: string) => deleteFont(id),
        onSuccess: (result) => {
            onUploaded(result);
            toast.success('Font removed.');
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <TitledGreyBox title={'Uploaded fonts'}>
            <p className={'mb-4 text-sm text-muted-foreground'}>
                Upload one file per weight and style: WOFF2, WOFF, TTF, or OTF, up to 3 MB each, {payload.max_fonts} files at most. Make sure the font’s license allows web use.
            </p>
            <div className={'flex flex-col gap-4'}>
                <Table
                    rows={fonts}
                    keyOf={(font) => font.id}
                    emptyState={'No uploaded fonts yet.'}
                    columns={[
                        { id: 'family', label: 'Family', cell: (font) => <span className={'font-medium text-foreground'}>{font.family}</span> },
                        { id: 'weight', label: 'Weight', cell: (font) => `${font.weight}${font.style === 'italic' ? ' italic' : ''}` },
                        { id: 'file', label: 'File', cell: (font) => <span className={'font-mono text-xs'}>{font.file.split('.').pop()?.toUpperCase()}</span> },
                        {
                            id: 'actions',
                            label: '',
                            cell: (font) => (
                                <span className={'flex justify-end'}>
                                    <Button.Text size={'xsmall'} disabled={remove.isPending} onClick={() => remove.mutate(font.id)}>
                                        Remove
                                    </Button.Text>
                                </span>
                            ),
                        },
                    ]}
                />
                <div className={'grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_auto]'}>
                    <div className={'flex flex-col gap-2'}>
                        <Label>File</Label>
                        <input
                            ref={input}
                            type={'file'}
                            accept={'.woff2,.woff,.ttf,.otf'}
                            className={'hidden'}
                            onChange={(event) => {
                                const chosen = event.target.files?.[0] ?? null;
                                setFile(chosen);
                                if (chosen && !family) setFamily(chosen.name.replace(/\.[^.]+$/, '').replace(/[-_](regular|bold|italic|medium|light|semibold|\d+).*$/i, '').replace(/[^A-Za-z0-9 -]/g, ' ').trim());
                                event.target.value = '';
                            }}
                        />
                        <Button isSecondary onClick={() => input.current?.click()}>
                            <span className={'block max-w-48 truncate'}>{file ? file.name : 'Choose file'}</span>
                        </Button>
                    </div>
                    <div className={'flex flex-col gap-2'}>
                        <Label htmlFor={'ct-upload-family'}>Family name</Label>
                        <Input id={'ct-upload-family'} value={family} placeholder={'My Font'} onChange={(event) => setFamily(event.target.value)} />
                    </div>
                    <div className={'flex flex-col gap-2'}>
                        <Label htmlFor={'ct-upload-weight'}>Weight</Label>
                        <Select id={'ct-upload-weight'} value={weight} options={WEIGHTS.map((w) => ({ value: w, label: String(w) }))} onChange={(value) => setWeight(Number(value))} />
                    </div>
                    <div className={'flex flex-col gap-2'}>
                        <Label htmlFor={'ct-upload-style'}>Style</Label>
                        <Select
                            id={'ct-upload-style'}
                            value={style}
                            options={[
                                { value: 'normal', label: 'Normal' },
                                { value: 'italic', label: 'Italic' },
                            ]}
                            onChange={(value) => setStyle(value === 'italic' ? 'italic' : 'normal')}
                        />
                    </div>
                    <Button disabled={!file || !family.trim() || fonts.length >= payload.max_fonts} isLoading={upload.isPending} onClick={() => upload.mutate()}>
                        Upload
                    </Button>
                </div>
            </div>
        </TitledGreyBox>
    );
}

export default function TypographyEditor({ payload, draft, onChange, onUploaded }: Props) {
    const { custom_fonts: customFonts, revision } = payload.config;

    useEffect(() => {
        loadFontForPreview(draft.fonts.body, customFonts, revision);
        loadFontForPreview(draft.fonts.heading, customFonts, revision);
    }, [draft.fonts, customFonts, revision]);

    const setFont = (role: 'body' | 'heading', font: FontRef) => onChange({ ...draft, fonts: { ...draft.fonts, [role]: font } });

    return (
        <div className={'flex flex-col gap-6'}>
            <div className={'grid items-start gap-6 xl:grid-cols-3'}>
                <TitledGreyBox title={'Body text'}>
                    <FontField role={'body'} font={draft.fonts.body} payload={payload} onChange={(font) => setFont('body', font)} />
                </TitledGreyBox>
                <TitledGreyBox title={'Headings'}>
                    <FontField role={'heading'} font={draft.fonts.heading} payload={payload} onChange={(font) => setFont('heading', font)} />
                </TitledGreyBox>
                <TitledGreyBox title={'Preview'}>
                    <div className={'flex flex-col gap-3'}>
                        <p className={'text-2xl font-semibold text-foreground'} style={{ fontFamily: fontStack(draft.fonts.heading) ?? undefined }}>
                            Survival Network
                        </p>
                        <p className={'text-sm leading-relaxed text-muted-foreground'} style={{ fontFamily: fontStack(draft.fonts.body) ?? undefined }}>
                            The quick brown fox jumps over the lazy dog. 0123456789. Your server is online and ready for players.
                        </p>
                        <p className={'text-xs text-muted-foreground'}>
                            The whole Panel previews your choice too. Google fonts load from fonts.googleapis.com.
                        </p>
                    </div>
                </TitledGreyBox>
            </div>
            <UploadedFonts payload={payload} onUploaded={onUploaded} />
        </div>
    );
}
