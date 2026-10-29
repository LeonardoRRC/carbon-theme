import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Dialog, Input, Label, Select, Spinner } from '@pterodactyl/sdk';
import { searchIcons, type IconCatalog } from '../api';
import IconGlyph from './IconGlyph';

interface Props {
    open: boolean;
    title: string;
    catalog: IconCatalog;
    current: string | null;
    onClose: () => void;
    onSelect: (reference: string, svg: string) => void;
}

function useDebounced<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default function IconPicker({ open, title, catalog, current, onClose, onSelect }: Props) {
    const currentPack = current?.split(':')[0];
    const [pack, setPack] = useState(currentPack && catalog.packs.some((p) => p.id === currentPack) ? currentPack : 'all');
    const [query, setQuery] = useState(current?.split(':')[1]?.split('-')[0] ?? '');
    const [page, setPage] = useState(1);
    const search = useDebounced(query, 250);

    useEffect(() => setPage(1), [pack, search]);

    const packs = useMemo(() => new Map(catalog.packs.map((p) => [p.id, p])), [catalog]);
    const options = useMemo(
        () => [
            { value: 'all', label: `All packs · ${catalog.total.toLocaleString()}`, textLabel: 'All packs' },
            ...[...catalog.packs]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => ({ value: p.id, label: `${p.name} · ${p.count.toLocaleString()}`, textLabel: p.name })),
        ],
        [catalog],
    );

    const icons = useQuery({
        queryKey: ['carbon-theme', 'icons', pack, search, page],
        queryFn: () => searchIcons(pack, search, page),
        enabled: open,
        placeholderData: keepPreviousData,
        staleTime: Infinity,
    });

    const pages = icons.data ? Math.max(1, Math.ceil(icons.data.total / icons.data.per_page)) : 1;
    const packInfo = packs.get(pack);

    return (
        <Dialog open={open} onClose={onClose} title={title}>
            <div className={'flex flex-col gap-4'}>
                <div className={'grid gap-3 sm:grid-cols-2'}>
                    <div className={'flex flex-col gap-2'}>
                        <Label htmlFor={'ct-icon-pack'}>Icon pack</Label>
                        <Select
                            id={'ct-icon-pack'}
                            value={pack}
                            options={options}
                            searchPlaceholder={'Find a pack'}
                            onChange={(value) => setPack(String(value))}
                        />
                    </div>
                    <div className={'flex flex-col gap-2'}>
                        <Label htmlFor={'ct-icon-search'}>Search</Label>
                        <Input
                            id={'ct-icon-search'}
                            autoFocus
                            aria-label={'Search icons'}
                            placeholder={'home, folder, server…'}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                </div>

                <div className={'relative min-h-64'}>
                    {icons.isLoading ? (
                        <div className={'flex h-64 items-center justify-center'}>
                            <Spinner />
                        </div>
                    ) : icons.data && icons.data.icons.length > 0 ? (
                        <div className={'grid max-h-80 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8 md:grid-cols-10'}>
                            {icons.data.icons.map((icon) => {
                                const reference = `${icon.pack}:${icon.name}`;
                                const selected = reference === current;
                                const label = pack === 'all' ? `${icon.name} · ${packs.get(icon.pack)?.name ?? icon.pack}` : icon.name;

                                return (
                                    <button
                                        key={reference}
                                        type={'button'}
                                        title={label}
                                        aria-label={label}
                                        aria-pressed={selected}
                                        onClick={() => onSelect(reference, icon.svg)}
                                        className={[
                                            'flex aspect-square items-center justify-center rounded-md border transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            selected
                                                ? 'border-primary bg-primary/15 text-foreground'
                                                : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
                                        ].join(' ')}
                                    >
                                        <IconGlyph svg={icon.svg} size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className={'flex h-64 items-center justify-center text-sm text-muted-foreground'}>
                            No icons match &ldquo;{search}&rdquo;.
                        </p>
                    )}
                </div>

                <div className={'flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'}>
                    <span>
                        {icons.data ? `${icons.data.total.toLocaleString()} icons` : ' '}
                        {' · '}
                        {packInfo ? (
                            <>
                                <a href={packInfo.url} target={'_blank'} rel={'noopener noreferrer'} className={'text-accent hover:underline'}>
                                    {packInfo.name}
                                </a>
                                , {packInfo.license}
                            </>
                        ) : (
                            <>
                                {catalog.packs.length} packs from{' '}
                                <a href={'https://react-icons.github.io/react-icons/'} target={'_blank'} rel={'noopener noreferrer'} className={'text-accent hover:underline'}>
                                    react-icons
                                </a>{' '}
                                {catalog.version}
                            </>
                        )}
                    </span>
                    <span className={'flex items-center gap-2'}>
                        <Button size={'xsmall'} isSecondary disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            Previous
                        </Button>
                        <span>
                            {page} / {pages}
                        </span>
                        <Button size={'xsmall'} isSecondary disabled={page >= pages} onClick={() => setPage(page + 1)}>
                            Next
                        </Button>
                    </span>
                </div>
            </div>
        </Dialog>
    );
}
