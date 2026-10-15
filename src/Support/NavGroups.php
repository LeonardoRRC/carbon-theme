<?php

namespace UK\TheQuantum\CarbonTheme\Support;

/**
 * Titled groups for the server sidebar. Items are reordered with CSS `order` (the sidebar is
 * a flex column), and the frontend draws each group's title, since only it knows which
 * items a user can see. Both apply only to the side navigation, from 1024px.
 *
 * @phpstan-type Group array{label: string, items: list<string>}
 */
final class NavGroups
{
    public const MAX_GROUPS = 10;

    public const LABEL_REGEX = '/^[\p{L}\p{N}][\p{L}\p{N} &\/.,\'()+-]{0,31}$/u';

    private const SIDE = '@media (width >= 64rem){:root[data-sub-navigation=side] %s}';

    /** @param list<Group> $groups */
    public static function css(array $groups): string
    {
        $rules = [];
        $payload = [];
        foreach (array_values($groups) as $index => $group) {
            $base = ($index + 1) * 100;
            $items = array_values(array_filter($group['items'], fn (string $key): bool => (bool) preg_match(RouteCatalog::KEY_REGEX, $key)));
            foreach ($items as $position => $key) {
                $rules[] = sprintf('[data-ct-route="%s"]{order:%d}', $key, $base + $position + 1);
            }
            $payload[] = ['label' => $group['label'], 'order' => $base, 'items' => $items];
        }

        // The admin link always ends the sidebar, with its label shown and a divider above it.
        $rules[] = '[data-ct-route="server:admin-view"]{order:9999;margin-top:.5rem;border-top:1px solid var(--border);white-space:normal!important}';
        $rules[] = '[data-ct-route="server:admin-view"] span span{display:inline!important}';

        $css = sprintf(self::SIDE, implode('', $rules));
        if ($payload !== []) {
            $css .= sprintf("\n:root{--ct-nav-groups:\"%s\"}", base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)));
        }

        return $css;
    }
}
