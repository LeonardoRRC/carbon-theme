<?php

namespace UK\TheQuantum\CarbonTheme\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Knuckles\Scribe\Attributes\Endpoint;
use UK\TheQuantum\CarbonTheme\Support\Branding;
use UK\TheQuantum\CarbonTheme\Support\IconPacks;
use UK\TheQuantum\CarbonTheme\Support\Layout;
use UK\TheQuantum\CarbonTheme\Support\NavGroups;
use UK\TheQuantum\CarbonTheme\Support\Palette;
use UK\TheQuantum\CarbonTheme\Support\RouteCatalog;
use UK\TheQuantum\CarbonTheme\Support\ThemeStore;
use UK\TheQuantum\CarbonTheme\Support\Typography;

/** Admin API under /api/admin/extensions/carbon-theme. Root administrators only. */
class ThemeController
{
    public function __construct(
        private readonly ThemeStore $store,
        private readonly RouteCatalog $routes,
        private readonly IconPacks $icons,
        private readonly Branding $branding,
    ) {
    }

    #[Endpoint('Get the theme configuration', 'Returns the configuration and everything the editor offers.')]
    public function show(): JsonResponse
    {
        return new JsonResponse($this->payload());
    }

    #[Endpoint('Update the theme configuration', 'Uploaded files are managed by their own endpoints and kept as they are.')]
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'preset' => ['required', Rule::in([...array_keys(Palette::PRESETS), 'custom', 'none'])],
            'colors' => ['present', 'array'],
            'colors.*' => ['string', 'regex:'.Palette::COLOR_REGEX],
            'radius' => ['nullable', 'numeric', 'between:'.Palette::MIN_RADIUS.','.Palette::MAX_RADIUS],
            'tab_icons' => ['required', 'boolean'],
            'icons' => ['present', 'array', 'max:200'],
            'icons.*' => ['string', 'regex:'.IconPacks::REFERENCE_REGEX],
            'layout' => ['required', 'array'],
            'layout.navigation' => ['required', Rule::in(Layout::NAVIGATION)],
            'layout.content_width' => ['required', Rule::in(array_keys(Layout::CONTENT_WIDTHS))],
            'layout.sidebar_width' => ['required', 'numeric', 'between:'.Layout::MIN_SIDEBAR.','.Layout::MAX_SIDEBAR],
            'layout.dashboard' => ['required', Rule::in(Layout::DASHBOARD)],
            'layout.toasts' => ['required', Rule::in(Layout::TOASTS)],
            'layout.console' => ['required', Rule::in(Layout::CONSOLE)],
            'layout.files' => ['required', Rule::in(Layout::FILES)],
            'layout.auth' => ['required', Rule::in(Layout::AUTH)],
            'logo_mode' => ['required', Rule::in(Branding::LOGO_MODES)],
            'fonts' => ['required', 'array'],
            'fonts.*.type' => ['required', Rule::in(Typography::TYPES)],
            'fonts.*.family' => ['nullable', 'string', 'regex:'.Typography::FAMILY_REGEX],
            'nav_groups' => ['present', 'array', 'max:'.NavGroups::MAX_GROUPS],
            'nav_groups.*.label' => ['required', 'string', 'regex:'.NavGroups::LABEL_REGEX],
            'nav_groups.*.items' => ['present', 'array', 'max:50'],
            'nav_groups.*.items.*' => ['string', 'regex:'.RouteCatalog::KEY_REGEX, 'starts_with:server:'],
        ], [
            'colors.*.regex' => 'Colors must be hex values such as #1b1c1f.',
            'fonts.*.family.regex' => 'Font names may use letters, numbers, spaces, and hyphens.',
            'nav_groups.*.label.regex' => 'Group names may be up to 32 letters, numbers, spaces, and simple punctuation.',
        ]);

        $current = $this->store->config();

        $icons = [];
        foreach ($data['icons'] as $key => $reference) {
            if (! preg_match(RouteCatalog::KEY_REGEX, (string) $key)) {
                throw ValidationException::withMessages(['icons' => sprintf('"%s" is not a navigation route.', $key)]);
            }
            if ($this->icons->svg($reference) === null) {
                throw ValidationException::withMessages(['icons' => sprintf('The icon "%s" does not exist.', $reference)]);
            }
            $icons[$key] = $reference;
        }

        $uploaded = array_unique(array_column($current['custom_fonts'], 'family'));
        $fonts = [];
        foreach (Typography::ROLES as $role) {
            $font = $data['fonts'][$role] ?? ['type' => 'panel'];
            if ($font['type'] === 'panel') {
                $fonts[$role] = ['type' => 'panel'];

                continue;
            }
            if (empty($font['family'])) {
                throw ValidationException::withMessages(["fonts.$role.family" => 'Enter the font name.']);
            }
            if ($font['type'] === 'custom' && ! in_array($font['family'], $uploaded, true)) {
                throw ValidationException::withMessages(["fonts.$role.family" => 'Upload this font before using it.']);
            }
            $fonts[$role] = ['type' => $font['type'], 'family' => $font['family']];
        }

        // An item belongs to one group, the first that lists it.
        $seen = [];
        $groups = [];
        foreach ($data['nav_groups'] as $group) {
            $items = array_values(array_filter(array_unique($group['items']), fn (string $key): bool => ! isset($seen[$key]) && $key !== 'server:admin-view'));
            foreach ($items as $key) {
                $seen[$key] = true;
            }
            $groups[] = ['label' => $group['label'], 'items' => $items];
        }

        $this->store->save([
            ...$current,
            'preset' => $data['preset'],
            'colors' => array_intersect_key(array_map('mb_strtolower', $data['colors']), Palette::TOKENS),
            'radius' => isset($data['radius']) ? round((float) $data['radius'], 3) : null,
            'tab_icons' => (bool) $data['tab_icons'],
            'icons' => $icons,
            'layout' => [
                'navigation' => $data['layout']['navigation'],
                'content_width' => $data['layout']['content_width'],
                'sidebar_width' => round((float) $data['layout']['sidebar_width'], 2),
                'dashboard' => $data['layout']['dashboard'],
                'toasts' => $data['layout']['toasts'],
                'console' => $data['layout']['console'],
                'files' => $data['layout']['files'],
                'auth' => $data['layout']['auth'],
            ],
            'branding' => [...$current['branding'], 'logo_mode' => $data['logo_mode']],
            'fonts' => $fonts,
            'nav_groups' => $groups,
        ]);

        return new JsonResponse($this->payload());
    }

    #[Endpoint('Upload the logo or favicon')]
    public function uploadBrand(Request $request, string $kind): JsonResponse
    {
        abort_unless(in_array($kind, ['logo', 'favicon'], true), 404);
        $request->validate(['file' => ['required', 'file']]);
        $current = $this->store->config();

        $stored = $kind === 'logo' ? $this->branding->storeLogo($request->file('file')) : $this->branding->storeFavicon($request->file('file'));
        $this->store->save([...$current, 'branding' => [...$current['branding'], $kind => $stored]]);

        return new JsonResponse($this->payload());
    }

    #[Endpoint('Remove the logo or favicon')]
    public function deleteBrand(string $kind): JsonResponse
    {
        abort_unless(in_array($kind, ['logo', 'favicon'], true), 404);
        $current = $this->store->config();
        if ($file = $current['branding'][$kind]['file'] ?? null) {
            $this->branding->delete('brand', $file);
        }
        $this->store->save([...$current, 'branding' => [...$current['branding'], $kind => null]]);

        return new JsonResponse($this->payload());
    }

    #[Endpoint('Upload a font file')]
    public function uploadFont(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file'],
            'family' => ['required', 'string', 'regex:'.Typography::FAMILY_REGEX],
            'weight' => ['required', 'integer', Rule::in([100, 200, 300, 400, 500, 600, 700, 800, 900])],
            'style' => ['required', Rule::in(['normal', 'italic'])],
        ], ['family.regex' => 'Font names may use letters, numbers, spaces, and hyphens.']);
        $current = $this->store->config();
        if (count($current['custom_fonts']) >= Branding::MAX_FONTS) {
            throw ValidationException::withMessages(['file' => sprintf('You can upload up to %d font files. Remove one first.', Branding::MAX_FONTS)]);
        }

        $font = $this->branding->storeFont($request->file('file'), $data['family'], (int) $data['weight'], $data['style']);
        $this->store->save([...$current, 'custom_fonts' => [...$current['custom_fonts'], $font]]);

        return new JsonResponse($this->payload());
    }

    #[Endpoint('Remove a font file')]
    public function deleteFont(string $id): JsonResponse
    {
        $current = $this->store->config();
        $remaining = [];
        foreach ($current['custom_fonts'] as $font) {
            if ($font['id'] === $id) {
                $this->branding->delete('fonts', $font['file']);
            } else {
                $remaining[] = $font;
            }
        }

        // Roles that used a family with no files left fall back to the Panel's font.
        $families = array_column($remaining, 'family');
        $fonts = array_map(fn (array $font): array => $font['type'] === 'custom' && ! in_array($font['family'], $families, true) ? ['type' => 'panel'] : $font, $current['fonts']);

        $this->store->save([...$current, 'custom_fonts' => $remaining, 'fonts' => $fonts]);

        return new JsonResponse($this->payload());
    }

    #[Endpoint('Search an icon pack')]
    public function icons(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pack' => ['required', 'string', 'max:16'],
            'q' => ['nullable', 'string', 'max:64'],
            'page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);
        abort_unless($data['pack'] === 'all' || $this->icons->has($data['pack']), 404, 'Unknown icon pack.');
        $perPage = 120;
        $page = (int) ($data['page'] ?? 1);
        $result = $this->icons->search($data['pack'], (string) ($data['q'] ?? ''), ($page - 1) * $perPage, $perPage);

        return new JsonResponse([...$result, 'page' => $page, 'per_page' => $perPage]);
    }

    private function payload(): array
    {
        $config = $this->store->config();
        $routes = $this->routes->all();

        // SVGs for every icon the editor shows without searching: saved and default icons.
        $references = array_unique(array_filter([...array_values($config['icons']), ...array_column($routes, 'default_icon')]));
        $svgs = [];
        foreach ($references as $reference) {
            if (($svg = $this->icons->svg($reference)) !== null) {
                $svgs[$reference] = $svg;
            }
        }

        return [
            'config' => $config,
            'presets' => Palette::PRESETS,
            'tokens' => array_map(fn (array $token, string $name): array => ['token' => $name, 'group' => $token[0], 'label' => $token[1]], Palette::TOKENS, array_keys(Palette::TOKENS)),
            'radius' => ['min' => Palette::MIN_RADIUS, 'max' => Palette::MAX_RADIUS],
            'sidebar' => ['min' => Layout::MIN_SIDEBAR, 'max' => Layout::MAX_SIDEBAR],
            'routes' => $routes,
            'icons' => $this->icons->catalog(),
            'svgs' => (object) $svgs,
            'google_fonts' => Typography::GOOGLE_PRESETS,
            'max_fonts' => Branding::MAX_FONTS,
            'max_groups' => NavGroups::MAX_GROUPS,
        ];
    }
}
