import { ShotPayButtonError } from './errors.js';
import { injectStyles } from './styles.js';
import type { ButtonSession, ShotPayButtonHandle, ShotPayButtonOptions } from './types.js';

const DEFAULT_LABEL = 'Pay with ShotPay';
const DEFAULT_LOADING_LABEL = 'Opening…';

/**
 * The brand's flag mark, geometry verbatim from the guidelines (the app's
 * `frontend/src/components/Brand.tsx` carries the same path). Filled with
 * `currentColor` so both themes use the one asset.
 */
const MARK_SVG =
    '<svg viewBox="0 0 42 32" fill="currentColor" aria-hidden="true">' +
    '<path d="M38.46 32 L13.97 32 L14.47 27.94 L38.96 27.94Z M24.34 26.41 L0 26.41 L0.51 22.35 L24.88 22.35Z M39.27 26.41 L25.96 26.41 L26.5 22.35 L39.77 22.35Z M25.08 20.83 L0.81 20.83 L1.32 16.76 L25.62 16.76Z M39.98 20.83 L26.7 20.83 L27.24 16.76 L40.48 16.76Z M25.82 15.24 L1.52 15.24 L3.54 0 L27.85 0Z M41.29 11.17 L40.79 15.24 L27.44 15.24 L27.98 11.17Z M42 5.59 L41.49 9.65 L28.19 9.65 L28.73 5.59Z" />' +
    '</svg>';

/**
 * Renders the ShotPay button into `element` — plain light-DOM nodes, so the
 * host page's tooling (tests, analytics, focus management) sees an ordinary
 * `<button>`. The button never holds ShotPay credentials: `createSession` or
 * `endpoint` is your own server, which is where the API key lives.
 */
export function mount<S extends ButtonSession = ButtonSession>(
    element: HTMLElement,
    options: ShotPayButtonOptions<S>,
): ShotPayButtonHandle<S> {
    assertSessionSource(options);

    const doc = element.ownerDocument;
    injectStyles(doc);

    let current = { ...options };
    let loading = false;
    let idempotencyKey = generateIdempotencyKey();

    const button = doc.createElement('button');
    button.className = 'shotpay-button';

    const iconElement = doc.createElement('span');
    iconElement.className = 'shotpay-button__icon';
    iconElement.innerHTML = MARK_SVG;
    button.appendChild(iconElement);

    const labelElement = doc.createElement('span');
    labelElement.className = 'shotpay-button__label';
    button.appendChild(labelElement);

    const errorElement = doc.createElement('p');
    errorElement.className = 'shotpay-button__error';
    errorElement.setAttribute('aria-live', 'polite');

    applyOptions();
    element.appendChild(button);
    element.appendChild(errorElement);

    async function handleClick(event: Event): Promise<void> {
        // Intercepted even as type="submit": Enter in a surrounding form
        // activates the button, but the form must never submit natively.
        event.preventDefault();

        if (loading || current.disabled === true) {
            return;
        }

        errorElement.textContent = '';
        setLoading(true);

        try {
            const session = await openSession();

            setLoading(false);

            if (session === null || session === undefined) {
                return;
            }

            // A fresh key per successful attempt: the next click is a new
            // checkout, not a retry of this one.
            idempotencyKey = generateIdempotencyKey();

            if (current.onSession === undefined) {
                button.ownerDocument.defaultView?.location.assign(session.checkout_url);
            } else {
                current.onSession(session);
            }
        } catch (caught) {
            // The key survives a failure so a retry replays the same attempt.
            setLoading(false);

            const error = caught instanceof Error ? caught : new Error(String(caught));

            if (current.onError === undefined) {
                errorElement.textContent = error.message;
            } else {
                current.onError(error);
            }
        }
    }

    button.addEventListener('click', handleClick);

    function openSession(): Promise<S | null | undefined> {
        if (current.createSession !== undefined) {
            return current.createSession({ idempotencyKey });
        }

        return requestSession<S>(current.endpoint as string, idempotencyKey);
    }

    function setLoading(next: boolean): void {
        loading = next;
        button.disabled = next || current.disabled === true;

        if (next) {
            button.setAttribute('aria-busy', 'true');
            button.setAttribute('data-loading', '');
            labelElement.textContent = current.loadingLabel ?? DEFAULT_LOADING_LABEL;
        } else {
            button.removeAttribute('aria-busy');
            button.removeAttribute('data-loading');
            labelElement.textContent = current.label ?? DEFAULT_LABEL;
        }
    }

    function applyOptions(): void {
        button.type = current.type ?? 'button';
        button.setAttribute('data-theme', current.theme ?? 'dark');
        button.setAttribute('data-size', current.size ?? 'md');
        button.setAttribute('data-radius', current.radius ?? 'md');
        button.setAttribute('data-width', current.fullWidth === false ? 'auto' : 'full');
        iconElement.hidden = current.showLogo === false;
        button.disabled = loading || current.disabled === true;

        if (!loading) {
            labelElement.textContent = current.label ?? DEFAULT_LABEL;
        }
    }

    return {
        update(next: Partial<ShotPayButtonOptions<S>>): void {
            current = { ...current, ...next };
            assertSessionSource(current);
            applyOptions();
        },
        destroy(): void {
            button.removeEventListener('click', handleClick);
            button.remove();
            errorElement.remove();
        },
    };
}

function assertSessionSource(options: { createSession?: unknown; endpoint?: string }): void {
    if (options.createSession !== undefined && options.endpoint !== undefined) {
        throw new ShotPayButtonError('Pass either createSession or endpoint, not both.');
    }

    if (options.createSession === undefined && options.endpoint === undefined) {
        throw new ShotPayButtonError('One of createSession or endpoint is required.');
    }
}

/**
 * `POST {}` to the merchant's own endpoint. Anything richer than an empty
 * body — a cart id, an amount — is what `createSession` is for.
 */
async function requestSession<S extends ButtonSession>(
    endpoint: string,
    idempotencyKey: string,
): Promise<S> {
    const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Idempotency-Key': idempotencyKey,
        },
        body: '{}',
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
        const message =
            typeof payload.message === 'string'
                ? payload.message
                : `The session endpoint responded with status ${response.status}.`;

        throw new ShotPayButtonError(message, response.status, payload);
    }

    const session = (isSession(payload.data) ? payload.data : payload) as Record<string, unknown>;

    if (!isSession(session)) {
        throw new ShotPayButtonError(
            'The session endpoint did not return a checkout_url.',
            response.status,
            payload,
        );
    }

    return session as unknown as S;
}

function isSession(value: unknown): value is ButtonSession {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).checkout_url === 'string'
    );
}

function generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `spb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
