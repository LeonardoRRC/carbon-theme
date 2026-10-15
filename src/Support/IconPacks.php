<?php

namespace UK\TheQuantum\CarbonTheme\Support;

/**
 * The icon sets from react-icons, built into resources/icons by scripts/build-icons.mjs.
 * Icons are referenced as "<pack>:<name>", such as "fa6:house" or "lu:folder".
 */
final class IconPacks
{
    public const REFERENCE_REGEX = '/^[a-z0-9]+:[a-z0-9]+(-[a-z0-9]+)*$/';

    /** References saved by 1.0, which shipped its own copies of three sets. */
    private const LEGACY_PACKS = ['lucide' => 'lu', 'tabler' => 'tb', 'phosphor' => 'pi'];

    /** @var array{source: string, version: string, packs: list<array{id: string, name: string, license: string, url: string, licenseUrl: string, names: list<string>}>}|null */
    private ?array $index = null;

    /** @var array<string, array<string, string>> */
    private array $loaded = [];

    public function __construct(private readonly string $directory)
    {
    }

    /** @return array{source: string, version: string, total: int, packs: list<array{id: string, name: string, license: string, url: string, count: int}>} */
    public function catalog(): array
    {
        $index = $this->index();
        $packs = array_map(fn (array $pack): array => [
            'id' => $pack['id'],
            'name' => $pack['name'],
            'license' => $pack['license'],
            'url' => $pack['url'],
            'count' => count($pack['names']),
        ], $index['packs']);

        return [
            'source' => $index['source'],
            'version' => $index['version'],
            'total' => array_sum(array_column($packs, 'count')),
            'packs' => $packs,
        ];
    }

    /** Rewrites a 1.0 reference such as "lucide:folder" to its react-icons pack. */
    public static function migrate(string $reference): string
    {
        [$pack, $name] = array_pad(explode(':', $reference, 2), 2, '');

        return isset(self::LEGACY_PACKS[$pack]) ? self::LEGACY_PACKS[$pack].':'.$name : $reference;
    }

    /** The minified SVG for "<pack>:<name>", or null when it does not exist. */
    public function svg(string $reference): ?string
    {
        if (! preg_match(self::REFERENCE_REGEX, $reference)) {
            return null;
        }
        [$pack, $name] = explode(':', $reference, 2);

        return $this->has($pack) ? ($this->icons($pack)[$name] ?? null) : null;
    }

    /**
     * Icons whose name contains every word of the query, in one pack or in all of them
     * ($pack = "all"). Names that start with the query come first, then shorter names.
     * Only the packs on the requested page are loaded.
     *
     * @return array{total: int, icons: list<array{pack: string, name: string, svg: string}>}
     */
    public function search(string $pack, string $query, int $offset, int $limit): array
    {
        $words = array_values(array_filter(preg_split('/[\s_-]+/', mb_strtolower(mb_trim($query))) ?: []));
        $needle = implode('-', $words);

        $matches = [];
        foreach ($this->index()['packs'] as $order => $entry) {
            if ($pack !== 'all' && $entry['id'] !== $pack) {
                continue;
            }
            foreach ($entry['names'] as $name) {
                foreach ($words as $word) {
                    if (! str_contains($name, $word)) {
                        continue 2;
                    }
                }
                $matches[] = [$entry['id'], $name, $order];
            }
        }

        if ($words !== []) {
            usort($matches, fn (array $a, array $b): int => [! str_starts_with($a[1], $needle), strlen($a[1]), $a[2], $a[1]]
                <=> [! str_starts_with($b[1], $needle), strlen($b[1]), $b[2], $b[1]]);
        }

        $page = array_slice($matches, $offset, $limit);

        // A page can span many packs; read them one at a time so only one is in memory.
        $svgs = [];
        foreach (array_unique(array_column($page, 0)) as $id) {
            $icons = $this->loaded[$id] ?? $this->read($id);
            foreach ($page as [$pack, $name]) {
                if ($pack === $id) {
                    $svgs[$id.':'.$name] = $icons[$name];
                }
            }
            unset($icons);
        }

        return [
            'total' => count($matches),
            'icons' => array_map(fn (array $match): array => [
                'pack' => $match[0],
                'name' => $match[1],
                'svg' => $svgs[$match[0].':'.$match[1]],
            ], $page),
        ];
    }

    public function has(string $pack): bool
    {
        return in_array($pack, array_column($this->index()['packs'], 'id'), true);
    }

    /** @return array<string, string> */
    private function icons(string $pack): array
    {
        return $this->loaded[$pack] ??= $this->read($pack);
    }

    /** @return array<string, string> */
    private function read(string $pack): array
    {
        return json_decode((string) file_get_contents($this->directory.'/'.$pack.'.json'), true, flags: JSON_THROW_ON_ERROR)['icons'];
    }

    private function index(): array
    {
        return $this->index ??= json_decode((string) file_get_contents($this->directory.'/index.json'), true, flags: JSON_THROW_ON_ERROR);
    }
}
