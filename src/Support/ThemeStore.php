<?php

namespace UK\TheQuantum\CarbonTheme\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Pterodactyl\Actions\Themes\ApplyTheme;
use Pterodactyl\Actions\Themes\ResetTheme;
use Pterodactyl\Services\Extensions\ExtensionHeadTags;
use Pterodactyl\Services\Extensions\ExtensionRepository;
use Pterodactyl\Services\Themes\ThemeService;

/**
 * The saved theme configuration, the stylesheet built from it, and its publication as the
 * Panel's applied theme. Publishing through the Panel's theme system puts the stylesheet in
 * the page <head>, so the theme is in place before the first paint, including the login page.
 */
final class ThemeStore
{
    public const ID = 'carbon-theme';

    /** First line of the published stylesheet, to tell it apart from another theme. */
    public const MARKER = '/* Carbon Theme';

    private const PUBLISHED_KEY = 'ext:carbon-theme:published';

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
            $config['preset'] === 'none' || $config['layout']['console'] !== 'carbon' ? '' : Palette::consoleCss($config['colors']),
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

    /**
     * Writes the theme to themes/carbon-theme and applies it with the Panel's own action,
     * which publishes tokens.css as /assets/theme.css and assets/ as /assets/theme.
     */
    public function publish(): void
    {
        $config = $this->config();
        $themes = app(ThemeService::class);
        $directory = $themes->directory().DIRECTORY_SEPARATOR.self::ID;

        File::ensureDirectoryExists($directory);
        File::put($directory.'/theme.json', json_encode([
            'id' => self::ID,
            'name' => 'Carbon Theme (managed by the Carbon Theme extension)',
            'version' => (string) $config['revision'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
        File::put($directory.'/tokens.css', $this->css($config));

        File::deleteDirectory($directory.'/assets');
        foreach (['brand', 'fonts'] as $folder) {
            if (File::isDirectory($this->branding->directory($folder))) {
                File::copyDirectory($this->branding->directory($folder), $directory.'/assets/'.$folder);
            }
        }

        app(ApplyTheme::class)->apply(self::ID);
        app(ExtensionHeadTags::class)->forget(self::ID);
        Cache::forever(self::PUBLISHED_KEY, true);
    }

    /**
     * Publishes once after the extension is enabled. Afterwards an administrator may apply
     * another theme with p:theme:apply, and it is left alone until the next save.
     */
    public function publishIfNeeded(): void
    {
        if (Cache::get(self::PUBLISHED_KEY) !== true) {
            $this->publish();
        }
    }

    /** Removes the published theme when it is still ours, restoring the Panel's look. */
    public function unpublish(): void
    {
        Cache::forget(self::PUBLISHED_KEY);
        $stylesheet = app(ThemeService::class)->publishedStylesheet();
        if (is_file($stylesheet) && str_starts_with((string) file_get_contents($stylesheet, length: 64), self::MARKER)) {
            app(ResetTheme::class)->reset();
        }
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
