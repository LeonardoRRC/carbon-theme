import { useEffect, useSyncExternalStore } from 'react';
import { useSiteSettings, type RouteSlotData } from '@pterodactyl/sdk';
import { authStyle, onLayoutChange } from '../runtime';

/** "Good morning", "Good afternoon", or "Good evening" in the visitor's time. */
export function greeting(date = new Date()): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
}

/** The heading and line above the form for each sign-in view. */
export function headingFor(pathname: string, name: string): { title: string; subtitle: string } {
    if (pathname.startsWith('/auth/login/checkpoint')) {
        return { title: 'Two-step verification', subtitle: 'Enter the code from your authenticator app.' };
    }
    if (pathname.startsWith('/auth/password/reset')) {
        return { title: 'Choose a new password', subtitle: 'Enter your email and your new password.' };
    }
    if (pathname.startsWith('/auth/password')) {
        return { title: 'Reset your password', subtitle: 'We will email you a link to choose a new one.' };
    }
    return { title: `Log in to ${name}`, subtitle: greeting() };
}

/**
 * Renders before every sign-in view in the Centered and Split designs: the logo, a greeting
 * or hint, and the title. The Split design also draws the brand panel on the left. The
 * Panel's own title and mark are hidden by the stylesheet.
 */
export default function AuthHead({ data }: { data: RouteSlotData }) {
    const style = useSyncExternalStore(onLayoutChange, authStyle, () => 'panel');
    const { name } = useSiteSettings();

    // Lets the stylesheet give sign-in pages their own background.
    useEffect(() => {
        document.documentElement.dataset.ctAuthPage = '';
        return () => {
            delete document.documentElement.dataset.ctAuthPage;
        };
    }, []);

    if (style === 'panel') return null;

    const { title, subtitle } = headingFor(data.pathname, name);

    return (
        <>
            {style === 'split' && (
                <aside className={'ct-auth-panel'} aria-hidden>
                    <div className={'ct-auth-brand'}>
                        <span className={'ct-auth-logo'} />
                        <span className={'ct-auth-brand-name'}>{name}</span>
                    </div>
                    <span className={'ct-auth-watermark'} />
                </aside>
            )}
            <div className={'ct-auth-head'}>
                {style === 'centered' && <span className={'ct-auth-logo ct-auth-logo-lg'} aria-hidden />}
                <p className={'ct-auth-subtitle'}>{subtitle}</p>
                <h1 className={'ct-auth-title'}>{title}</h1>
            </div>
        </>
    );
}
