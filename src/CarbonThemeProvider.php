<?php

namespace UK\TheQuantum\CarbonTheme;

use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Extensions\ExtensionDisabled;
use Pterodactyl\Events\Extensions\ExtensionRemoved;
use Pterodactyl\Extensions\ExtensionProvider;
use UK\TheQuantum\CarbonTheme\Support\IconPacks;
use UK\TheQuantum\CarbonTheme\Support\ThemeStore;

class CarbonThemeProvider extends ExtensionProvider
{
    public function register(): void
    {
        $this->app->singleton(IconPacks::class, fn (): IconPacks => new IconPacks($this->extensionPath('resources', 'icons')));
    }

    public function boot(): void
    {
        // /api/admin/extensions/carbon-theme/...
        $this->registerApiRoutes();

        // The uploaded favicon replaces the Panel's own.
        $this->registerHeadTags(fn (): array => $this->app->make(ThemeStore::class)->headTags());

        // Disabling or removing the extension restores the Panel's look.
        Event::listen(ExtensionDisabled::class, function (ExtensionDisabled $event): void {
            if ($event->manifest->id === ThemeStore::ID) {
                $this->app->make(ThemeStore::class)->unpublish();
            }
        });
        Event::listen(ExtensionRemoved::class, function (ExtensionRemoved $event): void {
            if ($event->identifier === ThemeStore::ID) {
                $this->app->make(ThemeStore::class)->unpublish();
            }
        });

        // Publish on the first web request after the extension is enabled. Web requests run as
        // the web server's user, so the published files stay writable for later saves.
        if (! $this->app->runningInConsole()) {
            rescue(fn () => $this->app->make(ThemeStore::class)->publishIfNeeded());
        }
    }
}
