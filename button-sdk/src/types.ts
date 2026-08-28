/**
 * The one field the button needs from whatever session object your server
 * returns — everything else on the response passes through to `onSession`
 * untouched.
 */
export interface ButtonSession {
    checkout_url: string;
}

export type ShotPayButtonTheme = 'dark' | 'light';

export type ShotPayButtonSize = 'sm' | 'md' | 'lg';

export type ShotPayButtonRadius = 'none' | 'sm' | 'md' | 'pill';

export interface ShotPayButtonOptions<S extends ButtonSession = ButtonSession> {
    /**
     * Asks your server to open a checkout session. Resolve with the session,
     * or with `null`/`undefined` to abort quietly — your own validation
     * failing, for example. Exactly one of `createSession` and `endpoint`
     * must be given.
     */
    createSession?: (context: { idempotencyKey: string }) => Promise<S | null | undefined>;

    /**
     * Convenience alternative to `createSession`: a URL on your server that
     * receives `POST {}` with an `Idempotency-Key` header and responds with
     * the session, either bare or wrapped in a `data` envelope.
     */
    endpoint?: string;

    /**
     * What to do with the opened session. Defaults to the checkout redirect:
     * `window.location.assign(session.checkout_url)`.
     */
    onSession?: (session: S) => void;

    /**
     * Replaces the button's own error line. Without it, a failure's message
     * is written to an `aria-live` element under the button.
     */
    onError?: (error: Error) => void;

    theme?: ShotPayButtonTheme;

    label?: string;

    loadingLabel?: string;

    size?: ShotPayButtonSize;

    radius?: ShotPayButtonRadius;

    /** `false` shrinks the button to its content instead of filling the host. */
    fullWidth?: boolean;

    /** `false` hides the ShotPay mark, leaving the label alone. */
    showLogo?: boolean;

    disabled?: boolean;

    /**
     * `'submit'` lets the button participate in a surrounding form — Enter in
     * a field activates it — while its click stays intercepted, so the form
     * never submits natively either way.
     */
    type?: 'button' | 'submit';
}

export interface ShotPayButtonHandle<S extends ButtonSession = ButtonSession> {
    update(options: Partial<ShotPayButtonOptions<S>>): void;
    destroy(): void;
}
