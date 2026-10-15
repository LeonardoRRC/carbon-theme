import { expect, test } from 'vitest';
import { formatBytes } from './ServerCard';

test('formats byte counts like the Panel', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.50 KiB');
    expect(formatBytes(1073741824)).toBe('1.00 GiB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.00 GiB');
    expect(formatBytes(150 * 1024 ** 2)).toBe('150 MiB');
});
