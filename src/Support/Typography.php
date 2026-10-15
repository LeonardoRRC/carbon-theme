<?php

namespace UK\TheQuantum\CarbonTheme\Support;

/**
 * Fonts for body text and headings. A font is one of:
 *   - panel:  the Panel's own font (IBM Plex Sans)
 *   - google: any Google Fonts family, loaded from fonts.googleapis.com
 *   - system: a font installed on the viewer's computer, by name
 *   - custom: a family uploaded as font files (see Branding::FONT_TYPES)
 *
 * @phpstan-type FontRef array{type: string, family?: string}
 */
final class Typography
{
    public const ROLES = ['body', 'heading'];

    public const TYPES = ['panel', 'google', 'system', 'custom'];

    /** Google Fonts shown as one-click choices in the editor. */
    public const GOOGLE_PRESETS = ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Nunito', 'Manrope', 'Outfit', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Rubik', 'Lexend'];

    public const FAMILY_REGEX = '/^[A-Za-z0-9][A-Za-z0-9 \-]{0,47}$/';

    public const DEFAULTS = ['body' => ['type' => 'panel'], 'heading' => ['type' => 'panel']];

    /** The Panel tokens each role sets. */
    private const TOKENS = ['body' => '--font-sans', 'heading' => '--font-header'];

    /**
     * @param  array<string, FontRef>  $fonts
     * @param  list<array{family: string, weight: int, style: string, file: string}>  $customFonts
     * @return array{imports: string, rules: string}
     */
    public static function css(array $fonts, array $customFonts): array
    {
        $fonts = array_merge(self::DEFAULTS, $fonts);
        $google = [];
        $declarations = [];

        foreach (self::ROLES as $role) {
            $font = $fonts[$role];
            $family = (string) ($font['family'] ?? '');
            if ($font['type'] === 'panel' || ! preg_match(self::FAMILY_REGEX, $family)) {
                continue;
            }
            if ($font['type'] === 'google') {
                $google[$family] = true;
            }
            $declarations[] = sprintf("%s:'%s',system-ui,sans-serif;", self::TOKENS[$role], $family);
        }

        $imports = '';
        if ($google !== []) {
            $families = implode('&', array_map(fn (string $family): string => 'family='.str_replace(' ', '+', $family).':wght@400;500;600;700', array_keys($google)));
            $imports = sprintf("@import url('https://fonts.googleapis.com/css2?%s&display=swap');", $families);
        }

        $faces = array_map(fn (array $face): string => sprintf(
            "@font-face{font-family:'%s';src:url('/assets/theme/fonts/%s') format('%s');font-weight:%d;font-style:%s;font-display:swap}",
            $face['family'],
            $face['file'],
            self::format($face['file']),
            $face['weight'],
            $face['style'],
        ), array_values(array_filter($customFonts, fn (array $face): bool => (bool) preg_match(self::FAMILY_REGEX, $face['family']))));

        $rules = implode('', $faces);
        if ($declarations !== []) {
            $rules .= ':root,:root.dark{'.implode('', $declarations).'}';
        }

        return ['imports' => $imports, 'rules' => $rules];
    }

    private static function format(string $file): string
    {
        return match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'woff2' => 'woff2',
            'woff' => 'woff',
            'otf' => 'opentype',
            default => 'truetype',
        };
    }
}
