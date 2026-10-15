import { afterEach, expect, test } from 'vitest';
import { tagAuth } from './runtime';
import { greeting, headingFor } from './components/AuthHead';

afterEach(() => {
    document.body.innerHTML = '';
});

test('greets by the time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Good evening');
    expect(greeting(new Date(2026, 0, 1, 2))).toBe('Good evening');
});

test('titles each sign-in view', () => {
    expect(headingFor('/auth/login', 'Quantum').title).toBe('Log in to Quantum');
    expect(headingFor('/auth/login/checkpoint', 'Quantum').title).toBe('Two-step verification');
    expect(headingFor('/auth/password', 'Quantum').title).toBe('Reset your password');
    expect(headingFor('/auth/password/reset/abc', 'Quantum').title).toBe('Choose a new password');
});

test('marks the blocks of a sign-in page', () => {
    window.history.replaceState(null, '', '/auth/login');
    // The Panel's sign-in page, reduced to its structure.
    document.body.innerHTML = `
        <div id="layout">
            <div class="ct-auth-head"></div>
            <div id="box">
                <h2 id="title">Login to Continue</h2>
                <form><div id="card"><div id="mark"><svg></svg></div><div>fields</div></div></form>
                <p id="footer">© Pterodactyl</p>
            </div>
        </div>`;
    tagAuth(document);

    const part = (id: string) => document.getElementById(id)?.dataset.ctAuth;
    expect(['layout', 'box', 'title', 'card', 'mark', 'footer'].map(part)).toEqual(['layout', 'box', 'title', 'card', 'mark', 'footer']);
    window.history.replaceState(null, '', '/');
});
