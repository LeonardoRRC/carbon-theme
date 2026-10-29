<?php

namespace UK\TheQuantum\CarbonTheme;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Extensions\ExtensionDisabled;
use Pterodactyl\Events\Extensions\ExtensionRemoved;
use Pterodactyl\Extensions\ExtensionProvider;
use UK\TheQuantum\CarbonTheme\Support\IconPacks;
use UK\TheQuantum\CarbonTheme\Support\ThemeStore;

class CarbonThemeProvider extends ExtensionProvider
{
    /** Set once Carbon has made itself the active theme, so a later choice of another theme sticks. */
    private const ACTIVATED_KEY = 'ext:carbon-theme:activated';

    public function register(): void
    {
        $this->app->singleton(IconPacks::class, fn (): IconPacks => new IconPacks($this->extensionPath('resources', 'icons')));
    }

    public function boot(): void
    {
        // /api/admin/extensions/carbon-theme/...
        $this->registerApiRoutes();

        // /extensions/carbon-theme/theme.css and the uploaded files, public for the login page.
        $this->registerWebRoutes($this->extensionPath('routes', 'web.php'));

        // The uploaded favicon replaces the Panel's own.
        $this->registerHeadTags(fn (): array => $this->app->make(ThemeStore::class)->headTags());

        // Disabling or removing the extension forgets its favicon; enabling it again re-applies it.
        Event::listen(ExtensionDisabled::class, function (ExtensionDisabled $event): void {
            if ($event->manifest->id === ThemeStore::ID) {
                Cache::forget(self::ACTIVATED_KEY);
                $this->app->make(ThemeStore::class)->unpublish();
            }
        });
        Event::listen(ExtensionRemoved::class, function (ExtensionRemoved $event): void {
            if ($event->identifier === ThemeStore::ID) {
                Cache::forget(self::ACTIVATED_KEY);
                $this->app->make(ThemeStore::class)->unpublish();
            }
        });

        // Like Carbon 1.x, enabling the extension applies it: on the first web request after it is
        // enabled, Carbon becomes the Panel's active theme. Only once, so Admin > Themes stays in charge.
        if (! $this->app->runningInConsole() && Cache::get(self::ACTIVATED_KEY) !== true) {
            rescue(function (): void {
                $this->app->make(ThemeStore::class)->activate();
                Cache::forever(self::ACTIVATED_KEY, true);
            });
        }
    }
}
