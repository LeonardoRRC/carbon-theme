<?php

namespace UK\TheQuantum\CarbonTheme\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response;
use UK\TheQuantum\CarbonTheme\Support\Branding;
use UK\TheQuantum\CarbonTheme\Support\ThemeStore;

/**
 * What the frontend and the stylesheet load before sign-in: the stylesheet built from the saved
 * configuration, and the uploaded logo, favicon, and fonts. Both are public, like the Panel's own
 * assets, and hold nothing a visitor could not see on the login page.
 */
class AssetController extends Controller
{
    private const TYPES = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'ttf' => 'font/ttf',
        'otf' => 'font/otf',
    ];

    public function __construct(private readonly ThemeStore $store, private readonly Branding $branding)
    {
    }

    /** Revalidated on every load; a save changes the ETag, so a reload shows it at once. */
    public function stylesheet(Request $request): Response
    {
        $css = $this->store->stylesheet();
        $etag = '"'.sha1($css).'"';
        $headers = ['Content-Type' => 'text/css; charset=utf-8', 'Cache-Control' => 'no-cache', 'ETag' => $etag];

        if (in_array($etag, $request->getETags(), true)) {
            return response('', 304, $headers);
        }

        return response($css, 200, $headers);
    }

    /** Uploaded files; their URLs carry the revision or a unique name, so they cache for a year. */
    public function file(string $folder, string $file): Response
    {
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $path = $this->branding->directory($folder, $file);
        abort_unless(in_array($folder, Branding::FOLDERS, true) && isset(self::TYPES[$extension]) && is_file($path), 404);

        $headers = [
            'Content-Type' => self::TYPES[$extension],
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ];
        if ($extension === 'svg') {
            // Uploads are checked for scripts already; this keeps an SVG opened directly inert too.
            $headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        }

        return response()->file($path, $headers);
    }
}
