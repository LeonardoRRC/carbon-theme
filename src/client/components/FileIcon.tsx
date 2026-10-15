import { NamedIcon, type ComponentPartProps, type FileDetailsModel } from '@pterodactyl/sdk';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'muted' | 'chart-3' | 'chart-4';

const EXTENSIONS: [extensions: string[], icon: string, tone: Tone][] = [
    [['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'xz', 'bz2'], 'file-archive', 'warning'],
    [['jar'], 'coffee', 'success'],
    [['yml', 'yaml', 'json', 'toml', 'properties', 'conf', 'cfg', 'ini', 'env', 'xml'], 'file-cog', 'accent'],
    [['sh', 'bash', 'bat', 'cmd', 'ps1'], 'file-terminal', 'chart-3'],
    [['js', 'ts', 'mjs', 'py', 'java', 'php', 'lua', 'sk', 'rb', 'go', 'rs', 'cs', 'kt'], 'file-code', 'chart-3'],
    [['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'], 'file-image', 'chart-4'],
    [['db', 'sqlite', 'sql', 'mca', 'dat', 'nbt'], 'database', 'chart-4'],
    [['key', 'pem', 'crt', 'pub'], 'file-key', 'warning'],
    [['log', 'txt', 'md'], 'file-text', 'muted'],
];

/** The icon and color for a file, from its kind and extension. */
export function iconFor(model: Pick<FileDetailsModel, 'name' | 'kind'>): [icon: string, tone: Tone] {
    if (model.kind === 'directory') return ['folder', 'primary'];
    if (model.kind === 'symlink') return ['link', 'muted'];
    if (model.kind === 'archive') return ['file-archive', 'warning'];

    const extension = model.name.includes('.') ? model.name.split('.').pop()!.toLowerCase() : '';
    const match = EXTENSIONS.find(([extensions]) => extensions.includes(extension));

    return match ? [match[1], match[2]] : ['file', 'muted'];
}

/** Replaces the native row icon with a tinted badge. Presentation only: the row stays the Panel's. */
export default function FileIcon({ model }: ComponentPartProps<'server.files.details'>) {
    const [icon, tone] = iconFor(model);

    return (
        <span className={'ct-file-icon'} data-tone={tone} aria-hidden>
            <NamedIcon name={icon} />
        </span>
    );
}
