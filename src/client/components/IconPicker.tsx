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
            <div className={'ct:flex ct:flex-col ct:gap-4'}>
                <div className={'ct:grid ct:gap-3 ct:sm:grid-cols-2'}>
                    <div className={'ct:flex ct:flex-col ct:gap-2'}>
                        <Label htmlFor={'ct-icon-pack'}>Icon pack</Label>
                        <Select
                            id={'ct-icon-pack'}
                            value={pack}
                            options={options}
                            searchPlaceholder={'Find a pack'}
                            onChange={(value) => setPack(String(value))}
                        />
                    </div>
                    <div className={'ct:flex ct:flex-col ct:gap-2'}>
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

                <div className={'ct:relative ct:min-h-64'}>
                    {icons.isLoading ? (
                        <div className={'ct:flex ct:h-64 ct:items-center ct:justify-center'}>
                            <Spinner />
                        </div>
                    ) : icons.data && icons.data.icons.length > 0 ? (
                        <div className={'ct:grid ct:max-h-80 ct:grid-cols-6 ct:gap-1 ct:overflow-y-auto ct:sm:grid-cols-8 ct:md:grid-cols-10'}>
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
                                            'ct:flex ct:aspect-square ct:items-center ct:justify-center ct:rounded-md ct:border ct:transition-colors',
                                            'ct:focus-visible:outline-none ct:focus-visible:ring-2 ct:focus-visible:ring-ring',
                                            selected
                                                ? 'ct:border-primary ct:bg-primary/15 ct:text-foreground'
                                                : 'ct:border-transparent ct:text-muted-foreground ct:hover:border-border ct:hover:bg-muted ct:hover:text-foreground',
                                        ].join(' ')}
                                    >
                                        <IconGlyph svg={icon.svg} size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className={'ct:flex ct:h-64 ct:items-center ct:justify-center ct:text-sm ct:text-muted-foreground'}>
                            No icons match &ldquo;{search}&rdquo;.
                        </p>
                    )}
                </div>

                <div className={'ct:flex ct:flex-wrap ct:items-center ct:justify-between ct:gap-3 ct:text-xs ct:text-muted-foreground'}>
                    <span>
                        {icons.data ? `${icons.data.total.toLocaleString()} icons` : ' '}
                        {' · '}
                        {packInfo ? (
                            <>
                                <a href={packInfo.url} target={'_blank'} rel={'noopener noreferrer'} className={'ct:text-accent ct:hover:underline'}>
                                    {packInfo.name}
                                </a>
                                , {packInfo.license}
                            </>
                        ) : (
                            <>
                                {catalog.packs.length} packs from{' '}
                                <a href={'https://react-icons.github.io/react-icons/'} target={'_blank'} rel={'noopener noreferrer'} className={'ct:text-accent ct:hover:underline'}>
                                    react-icons
                                </a>{' '}
                                {catalog.version}
                            </>
                        )}
                    </span>
                    <span className={'ct:flex ct:items-center ct:gap-2'}>
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
