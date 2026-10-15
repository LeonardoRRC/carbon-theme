<?php

namespace UK\TheQuantum\CarbonTheme\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

/**
 * Uploaded logo, favicon, and font files. The originals live in storage/app/carbon-theme so
 * they survive Panel updates; publishing copies them into the theme's web assets
 * (/assets/theme/brand and /assets/theme/fonts).
 */
final class Branding
{
    public const LOGO_MODES = ['logo', 'logo-name', 'name'];

    private const LOGO_TYPES = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

    private const FAVICON_TYPES = ['png', 'ico', 'svg'];

    public const FONT_TYPES = ['woff2', 'woff', 'ttf', 'otf'];

    public const MAX_FONTS = 12;

    private const LIMITS_KB = ['logo' => 1024, 'favicon' => 512, 'font' => 3072];

    public function directory(string ...$parts): string
    {
        return implode(DIRECTORY_SEPARATOR, [storage_path('app/carbon-theme'), ...$parts]);
    }

    /** @return array{file: string, ratio: float} */
    public function storeLogo(UploadedFile $upload): array
    {
        $extension = $this->check($upload, 'logo', self::LOGO_TYPES);
        $this->deleteMatching('brand', 'logo.*');
        $file = 'logo.'.$extension;
        $path = $this->put($upload, 'brand', $file);

        return ['file' => $file, 'ratio' => $this->ratio($path, $extension)];
    }

    /** @return array{file: string, type: string} */
    public function storeFavicon(UploadedFile $upload): array
    {
        $extension = $this->check($upload, 'favicon', self::FAVICON_TYPES);
        $this->deleteMatching('brand', 'favicon.*');
        $file = 'favicon.'.$extension;
        $this->put($upload, 'brand', $file);

        return ['file' => $file, 'type' => ['png' => 'image/png', 'ico' => 'image/x-icon', 'svg' => 'image/svg+xml'][$extension]];
    }

    /** @return array{id: string, family: string, weight: int, style: string, file: string} */
    public function storeFont(UploadedFile $upload, string $family, int $weight, string $style): array
    {
        $extension = $this->check($upload, 'font', self::FONT_TYPES);
        $id = bin2hex(random_bytes(4));
        $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($family)) ?? '', '-') ?: 'font';
        $file = sprintf('%s-%d-%s-%s.%s', $slug, $weight, $style, $id, $extension);
        $this->put($upload, 'fonts', $file);

        return ['id' => $id, 'family' => $family, 'weight' => $weight, 'style' => $style, 'file' => $file];
    }

    public function delete(string $folder, string $file): void
    {
        if (preg_match('/^[a-z0-9.-]+$/', $file)) {
            File::delete($this->directory($folder, $file));
        }
    }

    /**
     * Header and login logo rules. The header shows the logo before the Panel name; "logo"
     * mode hides the name. The login page's Pterodactyl mark is replaced by the logo.
     *
     * @param  array{logo: array{file: string, ratio: float}|null, logo_mode: string}  $branding
     */
    public static function css(array $branding, int $revision): string
    {
        $logo = $branding['logo'] ?? null;
        if ($logo === null) {
            return '';
        }

        $url = sprintf("url('/assets/theme/brand/%s?v=%d')", $logo['file'], $revision);
        $ratio = max(0.2, min(8.0, (float) $logo['ratio']));
        $mode = in_array($branding['logo_mode'] ?? '', self::LOGO_MODES, true) ? $branding['logo_mode'] : 'logo-name';

        // The sign-in designs draw the logo themselves from these.
        $rules = [sprintf(':root{--ct-logo:%s;--ct-logo-ratio:%s}', $url, $ratio)];
        if ($mode !== 'name') {
            $rules[] = "#logo>a{display:flex!important;align-items:center;gap:.625rem}";
            $rules[] = sprintf('#logo>a::before{content:"";flex:none;height:2rem;width:calc(2rem * %s);max-width:12rem;background:%s left center/contain no-repeat}', $ratio, $url);
            if ($mode === 'logo') {
                $rules[] = '#logo>a{font-size:0!important;line-height:0}';
            }
        }
        $rules[] = 'svg[aria-label="Pterodactyl"].mx-auto{display:none!important}';
        $rules[] = sprintf(':has(>svg[aria-label="Pterodactyl"].mx-auto)::before{content:"";display:block;margin:0 auto 1rem;width:min(14rem,70vw);aspect-ratio:%s;max-height:7rem;background:%s center/contain no-repeat}', $ratio, $url);

        return implode("\n", $rules);
    }

    /**
     * Favicon elements for ExtensionProvider::registerHeadTags, replacing the Panel's own.
     *
     * @param  array{favicon: array{file: string, type: string}|null}  $branding
     * @return list<array<string, string>>
     */
    public static function headTags(array $branding, int $revision): array
    {
        $favicon = $branding['favicon'] ?? null;
        if ($favicon === null) {
            return [];
        }
        $href = sprintf('/assets/theme/brand/%s?v=%d', $favicon['file'], $revision);

        return [
            ['tag' => 'link', 'rel' => 'icon', 'type' => $favicon['type'], 'href' => $href],
            ['tag' => 'link', 'rel' => 'shortcut icon', 'href' => $href],
            ['tag' => 'link', 'rel' => 'apple-touch-icon', 'href' => $href],
        ];
    }

    /** @param list<string> $types */
    private function check(UploadedFile $upload, string $kind, array $types): string
    {
        $extension = strtolower($upload->getClientOriginalExtension());
        $fail = fn (string $message) => throw ValidationException::withMessages(['file' => $message]);

        if (! $upload->isValid()) {
            $fail('The upload failed. Try again.');
        }
        if (! in_array($extension, $types, true)) {
            $fail(sprintf('Use a %s file.', implode(', ', array_map('strtoupper', $types))));
        }
        if ($upload->getSize() > self::LIMITS_KB[$kind] * 1024) {
            $fail(sprintf('The file must be %d KB or smaller.', self::LIMITS_KB[$kind]));
        }

        $head = (string) file_get_contents($upload->getRealPath(), length: 512);
        $valid = match ($extension) {
            'png' => str_starts_with($head, "\x89PNG"),
            'jpg', 'jpeg' => str_starts_with($head, "\xFF\xD8"),
            'webp' => str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP',
            'ico' => str_starts_with($head, "\x00\x00\x01\x00"),
            'woff2' => str_starts_with($head, 'wOF2'),
            'woff' => str_starts_with($head, 'wOFF'),
            'ttf' => str_starts_with($head, "\x00\x01\x00\x00") || str_starts_with($head, 'true'),
            'otf' => str_starts_with($head, 'OTTO'),
            'svg' => $this->safeSvg((string) file_get_contents($upload->getRealPath())),
            default => false,
        };
        if (! $valid) {
            $fail($extension === 'svg'
                ? 'This SVG cannot be used. It must not contain scripts, event handlers, or external references.'
                : sprintf('This is not a valid %s file.', strtoupper($extension)));
        }

        return $extension === 'jpeg' ? 'jpg' : $extension;
    }

    /** SVGs are served from the Panel's domain, so anything that can run code or load content is refused. */
    private function safeSvg(string $svg): bool
    {
        return (bool) preg_match('/<svg[\s>]/i', $svg)
            && ! preg_match('/<script|<foreignObject|<!ENTITY|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|data:text\/html|(?:xlink:)?href\s*=\s*["\']\s*(?!#)/i', $svg);
    }

    private function put(UploadedFile $upload, string $folder, string $file): string
    {
        File::ensureDirectoryExists($this->directory($folder));
        $path = $this->directory($folder, $file);
        File::copy($upload->getRealPath(), $path);

        return $path;
    }

    private function deleteMatching(string $folder, string $pattern): void
    {
        foreach (File::glob($this->directory($folder, $pattern)) as $path) {
            File::delete($path);
        }
    }

    private function ratio(string $path, string $extension): float
    {
        if ($extension === 'svg') {
            $svg = (string) file_get_contents($path);
            if (preg_match('/viewBox\s*=\s*["\']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i', $svg, $m) && (float) $m[2] > 0) {
                return round((float) $m[1] / (float) $m[2], 4);
            }
            if (preg_match('/<svg[^>]*\swidth\s*=\s*["\']([\d.]+)[^>]*\sheight\s*=\s*["\']([\d.]+)/i', $svg, $m) && (float) $m[2] > 0) {
                return round((float) $m[1] / (float) $m[2], 4);
            }

            return 1.0;
        }
        $size = @getimagesize($path);

        return $size && $size[1] > 0 ? round($size[0] / $size[1], 4) : 1.0;
    }
}
