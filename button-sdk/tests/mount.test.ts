import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../src/mount.js';
import type { ButtonSession, ShotPayButtonOptions } from '../src/types.js';

const session: ButtonSession = { checkout_url: 'https://checkout.shotpay.test/cs_123' };

function host(): HTMLElement {
    const element = document.createElement('div');
    document.body.appendChild(element);
    return element;
}

function buttonIn(element: HTMLElement): HTMLButtonElement {
    return element.querySelector('button.shotpay-button') as HTMLButtonElement;
}

function errorIn(element: HTMLElement): HTMLParagraphElement {
    return element.querySelector('.shotpay-button__error') as HTMLParagraphElement;
}

/** Resolves once the click handler's async flow has settled. */
async function settled(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

afterEach(() => {
    document.body.innerHTML = '';
    document.getElementById('shotpay-button-styles')?.remove();
});

describe('mount', () => {
    it('renders a real button with the default label and dark theme', () => {
        const element = host();
        mount(element, { createSession: async () => session });

        const button = buttonIn(element);
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Pay with ShotPay');
        expect(button.getAttribute('data-theme')).toBe('dark');
        expect(button.type).toBe('button');
    });

    it('carries the brand mark, hidden from the accessible name', () => {
        const element = host();
        mount(element, { createSession: async () => session });

        const svg = buttonIn(element).querySelector('.shotpay-button__icon svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('fill')).toBe('currentColor');
    });

    it('respects label, theme, and type options', () => {
        const element = host();
        mount(element, {
            createSession: async () => session,
            label: 'Layaway with ShotPay',
            theme: 'light',
            type: 'submit',
        });

        const button = buttonIn(element);
        expect(button.textContent).toBe('Layaway with ShotPay');
        expect(button.getAttribute('data-theme')).toBe('light');
        expect(button.type).toBe('submit');
    });

    it.each([
        ['neither given', {}],
        [
            'both given',
            { createSession: async () => session, endpoint: '/shotpay/session' },
        ],
    ])('refuses a session source that is %s', (_name, options) => {
        expect(() => mount(host(), options as ShotPayButtonOptions)).toThrowError(
            /createSession or endpoint/,
        );
    });

    it('hands createSession a UUID-shaped idempotency key', async () => {
        const element = host();
        const createSession = vi.fn(async () => session);
        mount(element, { createSession, onSession: () => {} });

        buttonIn(element).click();
        await settled();

        expect(createSession).toHaveBeenCalledOnce();
        const { idempotencyKey } = createSession.mock.calls[0][0] as { idempotencyKey: string };
        expect(idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('disables the button while the session opens and swallows a second click', async () => {
        const element = host();
        let release!: (value: ButtonSession) => void;
        const createSession = vi.fn(
            () => new Promise<ButtonSession>((resolve) => (release = resolve)),
        );
        mount(element, { createSession, onSession: () => {} });

        const button = buttonIn(element);
        button.click();
        await Promise.resolve();

        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');
        expect(button.textContent).toBe('Opening…');

        button.click();
        release(session);
        await settled();

        expect(createSession).toHaveBeenCalledOnce();
        expect(button.disabled).toBe(false);
        expect(button.textContent).toBe('Pay with ShotPay');
    });

    it('resets quietly when createSession resolves null', async () => {
        const element = host();
        const onSession = vi.fn();
        mount(element, { createSession: async () => null, onSession });

        buttonIn(element).click();
        await settled();

        expect(onSession).not.toHaveBeenCalled();
        expect(errorIn(element).textContent).toBe('');
        expect(buttonIn(element).disabled).toBe(false);
    });

    it('writes a rejection into the aria-live element', async () => {
        const element = host();
        mount(element, {
            createSession: async () => {
                throw new Error('Your session endpoint is down.');
            },
        });

        buttonIn(element).click();
        await settled();

        expect(errorIn(element).textContent).toBe('Your session endpoint is down.');
        expect(errorIn(element).getAttribute('aria-live')).toBe('polite');
    });

    it('routes a rejection to onError instead of the aria-live element', async () => {
        const element = host();
        const onError = vi.fn();
        mount(element, {
            createSession: async () => {
                throw new Error('nope');
            },
            onError,
        });

        buttonIn(element).click();
        await settled();

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'nope' }));
        expect(errorIn(element).textContent).toBe('');
    });

    it('replays the idempotency key after a failure and mints a new one after a success', async () => {
        const element = host();
        const keys: string[] = [];
        let attempt = 0;
        mount(element, {
            createSession: async ({ idempotencyKey }) => {
                keys.push(idempotencyKey);
                attempt += 1;
                if (attempt === 1) {
                    throw new Error('first attempt fails');
                }
                return session;
            },
            onSession: () => {},
        });

        const button = buttonIn(element);
        button.click();
        await settled();
        button.click();
        await settled();
        button.click();
        await settled();

        expect(keys[1]).toBe(keys[0]);
        expect(keys[2]).not.toBe(keys[1]);
    });

    it('redirects to the checkout by default', async () => {
        const element = host();
        const assign = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({
            ...window.location,
            assign,
        } as unknown as Location);
        mount(element, { createSession: async () => session });

        buttonIn(element).click();
        await settled();

        expect(assign).toHaveBeenCalledWith(session.checkout_url);
        vi.restoreAllMocks();
    });

    it('hands the session to onSession instead of redirecting', async () => {
        const element = host();
        const onSession = vi.fn();
        mount(element, { createSession: async () => session, onSession });

        buttonIn(element).click();
        await settled();

        expect(onSession).toHaveBeenCalledWith(session);
    });

    it('update() re-labels, re-themes, and disables', () => {
        const element = host();
        const handle = mount(element, { createSession: async () => session });

        handle.update({ label: 'Hold it for me', theme: 'light', disabled: true });

        const button = buttonIn(element);
        expect(button.textContent).toBe('Hold it for me');
        expect(button.getAttribute('data-theme')).toBe('light');
        expect(button.disabled).toBe(true);
    });

    it('destroy() removes what mount created', () => {
        const element = host();
        const handle = mount(element, { createSession: async () => session });

        handle.destroy();

        expect(element.querySelector('button')).toBeNull();
        expect(element.querySelector('.shotpay-button__error')).toBeNull();
    });

    it('injects the stylesheet once across two mounts', () => {
        mount(host(), { createSession: async () => session });
        mount(host(), { createSession: async () => session });

        expect(document.querySelectorAll('#shotpay-button-styles')).toHaveLength(1);
    });
});
