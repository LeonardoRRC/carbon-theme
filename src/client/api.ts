import { http } from '@pterodactyl/sdk';

const base = '/api/admin/extensions/carbon-theme';

export interface LayoutConfig {
    navigation: 'tabs' | 'side';
    content_width: 'standard' | 'wide' | 'full';
    sidebar_width: number;
    dashboard: 'panel' | 'rows' | 'cards';
    toasts: 'panel' | 'carbon';
    console: 'panel' | 'carbon' | 'blocks';
    files: 'panel' | 'carbon';
    auth: 'panel' | 'centered' | 'split';
}

export type FontType = 'panel' | 'google' | 'system' | 'custom';

export interface FontRef {
    type: FontType;
    family?: string;
}

export interface CustomFont {
    id: string;
    family: string;
    weight: number;
    style: 'normal' | 'italic';
    file: string;
}

export interface NavGroup {
    label: string;
    items: string[];
}

export interface Branding {
    logo: { file: string; ratio: number } | null;
    logo_mode: 'logo' | 'logo-name' | 'name';
    favicon: { file: string; type: string } | null;
}

export interface ThemeConfig {
    preset: string;
    colors: Record<string, string>;
    radius: number | null;
    tab_icons: boolean;
    icons: Record<string, string>;
    layout: LayoutConfig;
    branding: Branding;
    fonts: { body: FontRef; heading: FontRef };
    custom_fonts: CustomFont[];
    nav_groups: NavGroup[];
    revision: number;
}

export interface Preset {
    name: string;
    description: string;
    radius: number;
    colors: Record<string, string>;
}

export interface TokenInfo {
    token: string;
    group: 'surfaces' | 'text' | 'brand' | 'lines' | 'status';
    label: string;
}

export interface NavRoute {
    key: string;
    area: 'top' | 'server' | 'account' | 'admin';
    label: string;
    path: string;
    default_icon: string | null;
    source: string;
    tab: boolean;
}

export interface IconPack {
    id: string;
    name: string;
    license: string;
    url: string;
    count: number;
}

export interface IconCatalog {
    source: string;
    version: string;
    total: number;
    packs: IconPack[];
}

export interface ThemePayload {
    config: ThemeConfig;
    presets: Record<string, Preset>;
    tokens: TokenInfo[];
    radius: { min: number; max: number };
    sidebar: { min: number; max: number };
    routes: NavRoute[];
    icons: IconCatalog;
    svgs: Record<string, string>;
    google_fonts: string[];
    max_fonts: number;
    max_groups: number;
}

export interface IconPage {
    total: number;
    page: number;
    per_page: number;
    icons: { pack: string; name: string; svg: string }[];
}

/** The settings the editor changes and saves together. Uploaded files have their own endpoints. */
export interface ThemeUpdate {
    preset: string;
    colors: Record<string, string>;
    radius: number | null;
    tab_icons: boolean;
    icons: Record<string, string>;
    layout: LayoutConfig;
    logo_mode: Branding['logo_mode'];
    fonts: { body: FontRef; heading: FontRef };
    nav_groups: NavGroup[];
}

export const themeQueryKey = ['carbon-theme', 'config'] as const;

/** URL of an uploaded file as the published theme serves it. */
export const assetUrl = (folder: 'brand' | 'fonts', file: string, revision: number) =>
    `/extensions/carbon-theme/files/${folder}/${encodeURIComponent(file)}?v=${revision}`;

export async function getTheme(): Promise<ThemePayload> {
    const { data } = await http.get<ThemePayload>(`${base}/config`);
    return data;
}

export async function saveTheme(update: ThemeUpdate): Promise<ThemePayload> {
    const { data } = await http.put<ThemePayload>(`${base}/config`, update);
    return data;
}

export async function searchIcons(pack: string, q: string, page: number): Promise<IconPage> {
    const { data } = await http.get<IconPage>(`${base}/icons`, { params: { pack, q, page } });
    return data;
}

export async function uploadBrand(kind: 'logo' | 'favicon', file: File): Promise<ThemePayload> {
    const body = new FormData();
    body.append('file', file);
    const { data } = await http.post<ThemePayload>(`${base}/branding/${kind}`, body);
    return data;
}

export async function deleteBrand(kind: 'logo' | 'favicon'): Promise<ThemePayload> {
    const { data } = await http.delete<ThemePayload>(`${base}/branding/${kind}`);
    return data;
}

export async function uploadFont(file: File, family: string, weight: number, style: string): Promise<ThemePayload> {
    const body = new FormData();
    body.append('file', file);
    body.append('family', family);
    body.append('weight', String(weight));
    body.append('style', style);
    const { data } = await http.post<ThemePayload>(`${base}/fonts`, body);
    return data;
}

export async function deleteFont(id: string): Promise<ThemePayload> {
    const { data } = await http.delete<ThemePayload>(`${base}/fonts/${id}`);
    return data;
}
