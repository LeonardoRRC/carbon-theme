import { assetUrl, type CustomFont, type FontRef } from './api';

const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 -]{0,47}$/;

/** The CSS font-family value for a font, or null to keep the Panel's own. */
export function fontStack(font: FontRef): string | null {
    if (font.type === 'panel' || !font.family || !FAMILY.test(font.family)) return null;

    return `'${font.family}', system-ui, sans-serif`;
}

/**
 * Makes a font available for previews before it is saved: Google fonts get a stylesheet
 * link, uploaded fonts an @font-face rule. Each is added once.
 */
export function loadFontForPreview(font: FontRef, customFonts: CustomFont[], revision: number): void {
    if (!font.family || !FAMILY.test(font.family)) return;

    if (font.type === 'google') {
        const id = `ct-preview-font-${font.family.replace(/\s+/g, '-').toLowerCase()}`;
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
    }

    if (font.type === 'custom') {
        const id = `ct-preview-uploaded-${revision}`;
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = customFonts
            .map((f) => `@font-face{font-family:'${f.family}';src:url('${assetUrl('fonts', f.file, revision)}');font-weight:${f.weight};font-style:${f.style};font-display:swap}`)
            .join('\n');
        document.head.appendChild(style);
    }
}
