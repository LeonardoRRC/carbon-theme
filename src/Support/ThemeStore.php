<?php

namespace UK\TheQuantum\CarbonTheme\Support;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Contracts\Themes\ActivatesThemes;
use Pterodactyl\Services\Extensions\ExtensionHeadTags;
use Pterodactyl\Services\Extensions\ExtensionRepository;

/**
 * The saved theme configuration and the stylesheet built from it. Carbon is a Panel theme: its
 * base stylesheet (dist/theme.css) is linked in the page <head>, and the stylesheet built from
 * this configuration is served by the extension at /extensions/carbon-theme/theme.css, which
 * the frontend links before the Panel is shown, so nothing flashes, including the login page.
 */
final class ThemeStore
{
    public const ID = 'carbon-theme';

    /** First line of the built stylesheet. */
    public const MARKER = '/* Carbon Theme';

    /**
     * The built stylesheet for a build of the extension and a revision: a save writes a new
     * revision and an update changes the build, so nothing stale is served.
     */
    private const CSS_KEY = 'ext:carbon-theme:css:%s:%d';

    public function __construct(
        private readonly ExtensionRepository $extensions,
        private readonly RouteCatalog $routes,
        private readonly IconPacks $icons,
        private readonly Branding $branding,
    ) {
    }

    public function config(): array
    {
        $saved = $this->extensions->settings(self::ID)->get('config');
        $saved = is_string($saved) ? json_decode($saved, true) : $saved;
        $saved = is_array($saved) ? $saved : [];
        $carbon = Palette::PRESETS['carbon'];

        $config = array_merge([
            'preset' => 'carbon',
            'colors' => $carbon['colors'],
            'radius' => $carbon['radius'],
            'tab_icons' => true,
            'icons' => [],
            'layout' => Layout::DEFAULTS,
            'branding' => ['logo' => null, 'logo_mode' => 'logo-name', 'favicon' => null],
            'fonts' => Typography::DEFAULTS,
            'custom_fonts' => [],
            'nav_groups' => [],
            'revision' => 0,
        ], $saved);
        // Settings saved by earlier versions lack the newer keys.
        $config['layout'] = array_merge(Layout::DEFAULTS, $config['layout']);
        $config['branding'] = array_merge(['logo' => null, 'logo_mode' => 'logo-name', 'favicon' => null], $config['branding']);
        $config['fonts'] = array_merge(Typography::DEFAULTS, $config['fonts']);
        $config['icons'] = array_map(IconPacks::migrate(...), $config['icons']);

        return $config;
    }

    /** Saves the configuration under a new revision and publishes it. */
    public function save(array $config): array
    {
        $config['revision'] = $this->config()['revision'] + 1;
        $this->extensions->settings(self::ID)->set('config', json_encode($config, JSON_THROW_ON_ERROR));
        $this->publish();

        return $this->config();
    }

    /** The icon each navigation item shows: saved choices, then tab defaults when enabled. */
    public function effectiveIcons(array $config): array
    {
        $icons = $config['tab_icons'] ? $this->routes->tabDefaults() : [];

        return array_merge($icons, $config['icons']);
    }

    public function css(?array $config = null): string
    {
        $config ??= $this->config();
        $fonts = Typography::css($config['fonts'], $config['custom_fonts']);

        // @import must come before every other rule.
        return implode("\n", array_filter([
            sprintf('%s r%d (managed by the Carbon Theme extension; changes here are overwritten) */', self::MARKER, $config['revision']),
            $fonts['imports'],
            Layout::GATE,
            $config['preset'] === 'none' ? '' : Palette::css($config['colors'], $config['radius']),
            $config['preset'] === 'none' || $config['layout']['console'] === 'panel' ? '' : Palette::consoleCss($config['colors']),
            $fonts['rules'],
            Layout::css($config['layout']),
            Branding::css($config['branding'], $config['revision']),
            NavGroups::css($config['nav_groups']),
            $this->iconCss($this->effectiveIcons($config), $config['tab_icons']),
        ]))."\n";
    }

    /** @return list<array<string, string>> */
    public function headTags(): array
    {
        $config = $this->config();

        return Branding::headTags($config['branding'], $config['revision']);
    }

    /** The built stylesheet of the saved configuration, built once per revision. */
    public function stylesheet(): string
    {
        $config = $this->config();

        return Cache::rememberForever($this->cacheKey($config['revision']), function () use ($config): string {
            rescue(fn () => $this->syncThemeSettings($config));

            return $this->css($config);
        });
    }

    /**
     * Copies the palette into the theme settings the manifest declares under "Carbon (managed)".
     * The Panel writes those as tokens in the page head, before any stylesheet or script loads, so
     * the page has Carbon's colours while it loads; the built stylesheet then adds everything else.
     * With the Panel's own colours ("none") they are cleared, and the Panel's tokens apply.
     */
    private function syncThemeSettings(array $config): void
    {
        $settings = $this->extensions->settings(self::ID);
        $settings->forgetByPrefix('theme.');
        if ($config['preset'] === 'none') {
            return;
        }

        $values = [];
        foreach (array_keys(Palette::TOKENS) as $token) {
            $color = $config['colors'][$token] ?? null;
            if (is_string($color) && preg_match('/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $color)) {
                $values['theme.'.str_replace('-', '_', $token)] = strtolower($color);
            }
        }
        if (is_numeric($config['radius'] ?? null)) {
            $values['theme.radius'] = round((float) $config['radius'], 3);
        }
        $settings->setMany($values);
    }

    /** Drops what was built from the previous revision, after a save. */
    public function publish(): void
    {
        Cache::forget($this->cacheKey($this->config()['revision']));
        app(ExtensionHeadTags::class)->forget(self::ID);
    }

    /**
     * Makes Carbon the Panel's active theme, as enabling Carbon 1.x applied it. An administrator
     * can switch to another theme afterwards on Admin > Themes, and it is left alone.
     */
    public function activate(): void
    {
        app(ActivatesThemes::class)->activate(self::ID);
    }

    /** The source files that build the stylesheet change with each release of the extension. */
    private function cacheKey(int $revision): string
    {
        $files = [...(glob(__DIR__.'/*.php') ?: []), dirname(__DIR__, 2).'/extension.json'];
        $build = substr(md5(implode('|', array_map(fn (string $file): string => (string) @filemtime($file), $files))), 0, 12);

        return sprintf(self::CSS_KEY, $build, $revision);
    }

    /** Forgets the favicon tags; the Panel returns to its own look once Carbon is no longer active. */
    public function unpublish(): void
    {
        app(ExtensionHeadTags::class)->forget(self::ID);
    }

    /**
     * Masks each chosen icon over a pseudo-element painted with the link's text color, so
     * icons follow the palette and hover states. The frontend tags navigation links with
     * data-ct-route and data-ct-slot ("tab", "side", or "top").
     *
     * @param  array<string, string>  $icons  route key => icon reference
     */
    private function iconCss(array $icons, bool $tabIcons): string
    {
        $rules = [];
        $routes = [];
        foreach ($icons as $key => $reference) {
            $svg = $this->icons->svg($reference);
            if ($svg === null || ! preg_match(RouteCatalog::KEY_REGEX, $key)) {
                continue;
            }
            $routes[] = sprintf('[data-ct-route="%s"]', $key);
            $rules[] = sprintf('[data-ct-route="%s"]{--ct-icon:url("data:image/svg+xml,%s")}', $key, rawurlencode($svg));
        }
        if ($routes === []) {
            return '';
        }

        $any = ':is('.implode(',', $routes).')';
        $rules[] = "{$any}>svg,{$any}>span>svg{display:none!important}";
        $rules[] = "[data-ct-slot=tab]{$any}>span::before,:is([data-ct-slot=side],[data-ct-slot=top]){$any}::before{content:\"\";display:inline-block;flex:none;width:var(--ct-icon-size,1rem);height:var(--ct-icon-size,1rem);background-color:currentColor;-webkit-mask:var(--ct-icon) center/contain no-repeat;mask:var(--ct-icon) center/contain no-repeat}";
        $rules[] = '[data-ct-slot=top]{--ct-icon-size:1em}';
        if ($tabIcons) {
            // Icons widen the tabs; tighter spacing keeps them on one row where the Panel fit them
            // before. The same gap lines up extension tabs, which bring their own icon.
            $rules[] = '[data-ct-slot=tab]>span{gap:.375rem!important}';
            $rules[] = '@media (width < 64rem){[data-ct-slot=tab]{padding-left:.625rem!important;padding-right:.625rem!important}}';
            $rules[] = ':root:not([data-sub-navigation=side]) [data-ct-slot=tab]{padding-left:.625rem!important;padding-right:.625rem!important}';
        }

        return implode("\n", $rules);
    }
}
