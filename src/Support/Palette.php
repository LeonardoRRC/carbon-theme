<?php

namespace UK\TheQuantum\CarbonTheme\Support;

/**
 * The Panel color tokens this extension can set, and its built-in palettes. Token names
 * follow the theme guide (docs: guides/customization/themes#tokens).
 */
final class Palette
{
    /** Token => [group, label]. The order is the order of the admin editor. */
    public const TOKENS = [
        'background' => ['surfaces', 'Page background'],
        'card' => ['surfaces', 'Cards and panels'],
        'popover' => ['surfaces', 'Dialogs and menus'],
        'muted' => ['surfaces', 'Quiet backgrounds'],
        'foreground' => ['text', 'Main text'],
        'muted-foreground' => ['text', 'Secondary text'],
        'card-foreground' => ['text', 'Text on cards'],
        'popover-foreground' => ['text', 'Text in dialogs'],
        'primary' => ['brand', 'Primary buttons'],
        'primary-foreground' => ['brand', 'Text on primary'],
        'secondary' => ['brand', 'Secondary buttons'],
        'secondary-foreground' => ['brand', 'Text on secondary'],
        'accent' => ['brand', 'Links and highlights'],
        'accent-foreground' => ['brand', 'Text on accent'],
        'ring' => ['brand', 'Focus outline'],
        'border' => ['lines', 'Borders and dividers'],
        'input' => ['lines', 'Form fields'],
        'destructive' => ['status', 'Danger'],
        'destructive-foreground' => ['status', 'Text on danger'],
        'success' => ['status', 'Success'],
        'success-foreground' => ['status', 'Text on success'],
        'warning' => ['status', 'Warning'],
        'warning-foreground' => ['status', 'Text on warning'],
    ];

    public const PRESETS = [
        'carbon' => [
            'name' => 'Carbon',
            'description' => 'Near-black surfaces with a cobalt accent.',
            'radius' => 0.375,
            'colors' => [
                'background' => '#0b0c0e', 'card' => '#141518', 'popover' => '#1b1c20', 'muted' => '#1e1f23',
                'foreground' => '#e6e7ea', 'muted-foreground' => '#8d9099', 'card-foreground' => '#e6e7ea', 'popover-foreground' => '#e6e7ea',
                'primary' => '#3d7eff', 'primary-foreground' => '#ffffff', 'secondary' => '#24262b', 'secondary-foreground' => '#e6e7ea',
                'accent' => '#6ea2ff', 'accent-foreground' => '#0b0c0e', 'ring' => '#3d7eff',
                'border' => '#26282d', 'input' => '#23252a',
                'destructive' => '#e5484d', 'destructive-foreground' => '#ffffff',
                'success' => '#2fbf71', 'success-foreground' => '#08130d',
                'warning' => '#f0b429', 'warning-foreground' => '#1a1405',
            ],
        ],
        'gray-carbon' => [
            'name' => 'Gray Carbon',
            'description' => 'Graphite grays with a silver accent.',
            'radius' => 0.5,
            'colors' => [
                'background' => '#1b1c1f', 'card' => '#232428', 'popover' => '#2a2b30', 'muted' => '#2c2d32',
                'foreground' => '#ececee', 'muted-foreground' => '#9fa1a8', 'card-foreground' => '#ececee', 'popover-foreground' => '#ececee',
                'primary' => '#a8b3c7', 'primary-foreground' => '#15161a', 'secondary' => '#313238', 'secondary-foreground' => '#ececee',
                'accent' => '#c2cbdb', 'accent-foreground' => '#15161a', 'ring' => '#a8b3c7',
                'border' => '#36373d', 'input' => '#34353b',
                'destructive' => '#e5484d', 'destructive-foreground' => '#ffffff',
                'success' => '#3fb97a', 'success-foreground' => '#0a1a11',
                'warning' => '#e8b04a', 'warning-foreground' => '#1c1405',
            ],
        ],
    ];

    public const COLOR_REGEX = '/^#[0-9a-f]{6}([0-9a-f]{2})?$/';

    public const MIN_RADIUS = 0.0;

    public const MAX_RADIUS = 1.5;

    /**
     * Console tokens derived from a palette: a terminal a shade darker than the page, the
     * selection in the primary color, and chart lines in the primary and accent colors.
     * The terminal reads these once when it opens, so they are plain hex values.
     *
     * @param  array<string, string>  $colors
     */
    public static function consoleCss(array $colors): string
    {
        $hex = fn (string $token): ?string => isset($colors[$token]) && preg_match(self::COLOR_REGEX, $colors[$token]) ? substr($colors[$token], 0, 7) : null;
        $background = $hex('background');
        $primary = $hex('primary');
        $foreground = $hex('foreground');
        if ($background === null || $primary === null || $foreground === null) {
            return '';
        }

        $declarations = [
            '--terminal-background:'.self::shade($background, 0.32),
            '--terminal-selection:'.$primary.'59',
            '--terminal-selection-foreground:'.$foreground,
            '--chart-1:'.$primary,
        ];
        if ($accent = $hex('accent')) {
            $declarations[] = '--chart-2:'.$accent;
        }

        return ':root,:root.dark{'.implode(';', $declarations).'}';
    }

    /** Mixes a #rrggbb color with black. */
    private static function shade(string $color, float $amount): string
    {
        $channels = array_map(fn (string $pair): int => (int) round(hexdec($pair) * (1 - $amount)), str_split(substr($color, 1), 2));

        return vsprintf('#%02x%02x%02x', $channels);
    }

    /**
     * The token declarations for a saved palette, or an empty string when the Panel's
     * own colors are kept. Values were validated against COLOR_REGEX when they were saved.
     *
     * @param  array<string, string>  $colors
     */
    public static function css(array $colors, ?float $radius): string
    {
        $declarations = [];
        foreach (self::TOKENS as $token => $_) {
            if (isset($colors[$token]) && preg_match(self::COLOR_REGEX, $colors[$token])) {
                $declarations[] = sprintf('--%s:%s;', $token, $colors[$token]);
            }
        }
        if ($radius !== null) {
            $declarations[] = sprintf('--radius:%srem;', rtrim(rtrim(number_format($radius, 3, '.', ''), '0'), '.') ?: '0');
        }

        return $declarations === [] ? '' : ':root,:root.dark{'.implode('', $declarations).'}';
    }
}
