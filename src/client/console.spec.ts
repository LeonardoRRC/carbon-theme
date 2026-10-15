import { afterEach, expect, test } from 'vitest';
import { tagConsole } from './runtime';
import { formatUptime } from './components/ConsoleStatus';

afterEach(() => {
    document.body.innerHTML = '';
});

// The Panel's console page, reduced to its structure.
const CONSOLE_PAGE = `
    <div id="page">
        <div id="header" class="grid">
            <div><h1>Survival</h1><p></p></div>
            <div><div><button>Start</button><button>Restart</button><button>Stop</button></div></div>
        </div>
        <div id="main" class="grid">
            <div id="terminal-column">
                <div class="relative flex flex-col">
                    <div class="bg-terminal"><div role="textbox"><canvas></canvas></div></div>
                    <div><input class="bg-terminal" /><div></div></div>
                </div>
            </div>
            <div id="stats"><div>Address</div><div>Uptime</div></div>
        </div>
        <div id="charts"><div><div class="recharts-wrapper"></div></div></div>
    </div>`;

test('marks the console blocks by structure', () => {
    document.body.innerHTML = CONSOLE_PAGE;
    tagConsole(document);

    const part = (id: string) => document.getElementById(id)?.dataset.ctConsole;
    expect(part('page')).toBe('root');
    expect(part('header')).toBe('header');
    expect(part('main')).toBe('main');
    expect(part('terminal-column')).toBe('terminal');
    expect(part('stats')).toBe('stats');
    expect(part('charts')).toBe('charts');
});

test('does nothing on pages without a terminal', () => {
    document.body.innerHTML = '<div><h1>Files</h1><div class="grid"></div></div>';
    tagConsole(document);
    expect(document.querySelector('[data-ct-console]')).toBeNull();
});

test('formats uptime', () => {
    expect(formatUptime(42_000)).toBe('0m 42s');
    expect(formatUptime(4 * 60_000 + 10_000)).toBe('4m 10s');
    expect(formatUptime(2 * 3_600_000 + 15 * 60_000)).toBe('2h 15m');
    expect(formatUptime(3 * 86_400_000 + 4 * 3_600_000)).toBe('3d 4h');
});
