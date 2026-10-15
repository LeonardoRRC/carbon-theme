/**
 * Draws a pack icon in the current text color by masking it, the same way the generated
 * stylesheet draws navigation icons. The SVG is only ever used as an image.
 */
export default function IconGlyph({ svg, size = 16, className }: { svg?: string; size?: number; className?: string }) {
    if (!svg) {
        return (
            <span
                aria-hidden
                className={['ct:inline-block ct:shrink-0 ct:rounded-sm ct:border ct:border-dashed ct:border-border', className].join(' ')}
                style={{ width: size, height: size }}
            />
        );
    }

    const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}") center / contain no-repeat`;

    return (
        <span
            aria-hidden
            className={['ct:inline-block ct:shrink-0 ct:bg-current', className].join(' ')}
            style={{ width: size, height: size, mask, WebkitMask: mask }}
        />
    );
}
