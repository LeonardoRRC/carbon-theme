<?php

namespace UK\TheQuantum\CarbonTheme\Support;

/**
 * Layout options, built on the Panel's own layout hooks: the side navigation variant
 * (`<html data-sub-navigation="side">`), the --layout-* width tokens, the dashboard server
 * card replacement, and the toast markup.
 */
final class Layout
{
    public const DEFAULTS = ['navigation' => 'tabs', 'content_width' => 'standard', 'sidebar_width' => 16, 'dashboard' => 'rows', 'toasts' => 'carbon', 'console' => 'carbon', 'files' => 'carbon', 'auth' => 'centered'];

    public const NAVIGATION = ['tabs', 'side'];

    /** Option => --layout-content-width. Each keeps a gutter so content never touches the window edges. */
    public const CONTENT_WIDTHS = ['standard' => '75rem', 'wide' => 'min(90rem, calc(100% - 3rem))', 'full' => 'calc(100% - 3rem)'];

    /** "panel" keeps the Panel's own server rows; "rows" and "cards" use the Carbon server card. */
    public const DASHBOARD = ['panel', 'rows', 'cards'];

    public const TOASTS = ['panel', 'carbon'];

    /**
     * "panel" keeps the Panel's console page; "carbon" restyles it (see the extension stylesheet);
     * "blocks" rebuilds it as a row of titled stat blocks over a full-width terminal and charts.
     */
    public const CONSOLE = ['panel', 'carbon', 'blocks'];

    /** "panel" keeps the Panel's file manager; "carbon" uses the extension's file manager and row replacements. */
    public const FILES = ['panel', 'carbon'];

    /** Sign-in pages: the Panel's own, a centered card, or a split screen with a brand panel. */
    public const AUTH = ['panel', 'centered', 'split'];

    /**
     * The Panel draws its own layout before extensions load. This keeps it hidden until the
     * extension marks <html data-ct-ready>, and shows it anyway after 2.5s if it never does.
     */
    public const GATE = ':root:not([data-ct-ready]) #app{opacity:0;animation:ct-reveal 0s 2.5s forwards}'
        .'#app{transition:opacity .12s ease-out}@keyframes ct-reveal{to{opacity:1}}';

    public const MIN_SIDEBAR = 13;

    public const MAX_SIDEBAR = 20;

    /**
     * The frontend reads --ct-navigation and --ct-dashboard and sets data-sub-navigation and
     * data-ct-dashboard on <html>, since a stylesheet cannot set attributes.
     *
     * @param  array{navigation?: string, content_width?: string, sidebar_width?: int|float, dashboard?: string, toasts?: string}  $layout
     */
    public static function css(array $layout): string
    {
        $layout = array_merge(self::DEFAULTS, $layout);
        $navigation = in_array($layout['navigation'], self::NAVIGATION, true) ? $layout['navigation'] : 'tabs';
        $dashboard = in_array($layout['dashboard'], self::DASHBOARD, true) ? $layout['dashboard'] : 'rows';
        $width = self::CONTENT_WIDTHS[$layout['content_width']] ?? self::CONTENT_WIDTHS['standard'];
        $sidebar = max(self::MIN_SIDEBAR, min(self::MAX_SIDEBAR, (float) $layout['sidebar_width']));

        $toasts = in_array($layout['toasts'], self::TOASTS, true) ? $layout['toasts'] : 'carbon';
        $console = in_array($layout['console'], self::CONSOLE, true) ? $layout['console'] : 'carbon';
        $files = in_array($layout['files'], self::FILES, true) ? $layout['files'] : 'carbon';
        $auth = in_array($layout['auth'], self::AUTH, true) ? $layout['auth'] : 'centered';

        $css = sprintf(':root{--ct-navigation:%s;--ct-dashboard:%s;--ct-toasts:%s;--ct-console:%s;--ct-files:%s;--ct-auth:%s;--layout-sidebar-width:%srem}', $navigation, $dashboard, $toasts, $console, $files, $auth, $sidebar);
        if ($layout['content_width'] !== 'standard') {
            // Narrow screens keep the Panel's own width and padding.
            $css .= sprintf('@media (width >= 64rem){:root{--layout-content-width:%s}}', $width);
        }
        // Always included: the frontend turns it on with <html data-ct-toasts="carbon">, which
        // lets the editor preview either style before saving.
        $css .= "\n".self::toastCss();

        return $css;
    }

    /**
     * Toasts with a status-colored edge, a tinted icon, and a translucent surface. Sonner marks
     * each toast with data-sonner-toast and data-type.
     */
    private static function toastCss(): string
    {
        $on = ':root[data-ct-toasts=carbon] [data-sonner-toast]';
        $rules = [
            $on.'{border-radius:calc(var(--radius) * 1.4)!important;border-left-width:3px!important;background:color-mix(in oklab,var(--popover) 90%,transparent)!important;backdrop-filter:blur(12px);box-shadow:0 12px 32px -8px rgb(0 0 0 / .55)!important;align-items:center!important}',
            $on.' [data-icon]{width:2rem!important;height:2rem!important;margin:0!important;border-radius:999px;display:grid!important;place-items:center;background:color-mix(in oklab,currentColor 16%,transparent);color:var(--accent)}',
            $on.' [data-icon] svg{width:1rem!important;height:1rem!important;color:inherit!important}',
        ];
        foreach (['success' => 'success', 'error' => 'destructive', 'warning' => 'warning', 'info' => 'accent'] as $type => $token) {
            $rules[] = sprintf('%1$s[data-type=%2$s]{border-left-color:var(--%3$s)!important}%1$s[data-type=%2$s] [data-icon]{color:var(--%3$s)}', $on, $type, $token);
        }

        return implode("\n", $rules);
    }
}
