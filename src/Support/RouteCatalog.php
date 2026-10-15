<?php

namespace UK\TheQuantum\CarbonTheme\Support;

use Pterodactyl\Services\Extensions\ExtensionManifest;
use Pterodactyl\Services\Extensions\ExtensionRepository;

/**
 * Every navigation item the extension can give an icon: the Panel's own routes and the
 * screens of enabled extensions. Keys are "<area>:<path>" and match the data-ct-route
 * attribute the frontend sets on each navigation link.
 */
final class RouteCatalog
{
    public const KEY_REGEX = '/^(top|server|account|admin):[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/';

    /** Key => [label, path, default icon]. Server and account defaults apply to tabs only when tab icons are on. */
    private const CORE = [
        'top:dashboard' => ['Dashboard', '/', 'lu:layers'],
        'top:admin' => ['Admin', '/panel', 'lu:user-cog'],
        'server:console' => ['Console', '/server/{id}', 'lu:square-terminal'],
        'server:files' => ['Files', '/server/{id}/files', 'lu:folder'],
        'server:databases' => ['Databases', '/server/{id}/databases', 'lu:database'],
        'server:schedules' => ['Schedules', '/server/{id}/schedules', 'lu:calendar-clock'],
        'server:users' => ['Users', '/server/{id}/users', 'lu:users'],
        'server:backups' => ['Backups', '/server/{id}/backups', 'lu:archive'],
        'server:network' => ['Network', '/server/{id}/network', 'lu:network'],
        'server:startup' => ['Startup', '/server/{id}/startup', 'lu:rocket'],
        'server:settings' => ['Settings', '/server/{id}/settings', 'lu:settings'],
        'server:activity' => ['Activity', '/server/{id}/activity', 'lu:activity'],
        'server:admin-view' => ['Admin view', '/panel/servers/{id}', 'lu:external-link'],
        'account:overview' => ['Account', '/account', 'lu:user'],
        'account:api' => ['API Credentials', '/account/api', 'lu:key-round'],
        'account:ssh' => ['SSH Keys', '/account/ssh', 'lu:key-square'],
        'account:activity' => ['Activity', '/account/activity', 'lu:activity'],
        'admin:overview' => ['Overview', '/panel', 'lu:layout-dashboard'],
        'admin:activity' => ['Activity', '/panel/activity', 'lu:puzzle'],
        'admin:settings' => ['Settings', '/panel/settings', 'lu:settings'],
        'admin:users' => ['Users', '/panel/users', 'lu:users'],
        'admin:locations' => ['Locations', '/panel/locations', 'lu:map-pin'],
        'admin:nodes' => ['Nodes', '/panel/nodes', 'lu:network'],
        'admin:servers' => ['Servers', '/panel/servers', 'lu:server'],
        'admin:databases' => ['Database Hosts', '/panel/databases', 'lu:database'],
        'admin:mounts' => ['Mounts', '/panel/mounts', 'lu:folder-tree'],
        'admin:eggs' => ['Eggs', '/panel/eggs', 'lu:egg'],
        'admin:tags' => ['Tags', '/panel/tags', 'lu:tag'],
        'admin:extensions' => ['Extensions', '/panel/extensions', 'lu:blocks'],
        'admin:api' => ['API Keys', '/panel/api', 'lu:key-round'],
    ];

    private const AREA_ROOTS = ['server' => '/server/{id}', 'account' => '/account', 'admin' => '/panel'];

    public function __construct(private readonly ExtensionRepository $extensions)
    {
    }

    /**
     * @return list<array{key: string, area: string, label: string, path: string, default_icon: string|null, source: string, tab: bool}>
     */
    public function all(): array
    {
        $routes = [];
        foreach (self::CORE as $key => [$label, $path, $icon]) {
            $area = strtok($key, ':');
            $routes[] = [
                'key' => $key,
                'area' => $area,
                'label' => $label,
                'path' => $path,
                'default_icon' => $icon,
                'source' => 'Panel',
                'tab' => in_array($area, ['server', 'account'], true),
            ];
        }

        foreach ($this->extensions->enabled() as $manifest) {
            /** @var ExtensionManifest $manifest */
            foreach ($manifest->screens as $screen) {
                $area = $screen['area'] ?? null;
                $path = $screen['path'] ?? '';
                $key = $area.':'.$path;
                // Detail tabs and parameterized pages have no fixed navigation link.
                if (! isset($screen['nav'], self::AREA_ROOTS[$area]) || isset($screen['parent']) || str_contains($path, '$') || ! preg_match(self::KEY_REGEX, $key)) {
                    continue;
                }
                $routes[] = [
                    'key' => $key,
                    'area' => $area,
                    'label' => (string) ($screen['nav']['label'] ?? $path),
                    'path' => self::AREA_ROOTS[$area].'/'.$path,
                    'default_icon' => isset($screen['nav']['icon']) ? 'lu:'.$screen['nav']['icon'] : null,
                    'source' => $manifest->name,
                    'tab' => false,
                ];
            }
        }

        return $routes;
    }

    /** Icons the Panel shows on its own server and account tabs when tab icons are on. */
    public function tabDefaults(): array
    {
        $defaults = [];
        foreach (self::CORE as $key => [, , $icon]) {
            if (str_starts_with($key, 'server:') || str_starts_with($key, 'account:')) {
                $defaults[$key] = $icon;
            }
        }

        return $defaults;
    }
}
