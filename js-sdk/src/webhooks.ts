import { createHmac, timingSafeEqual } from 'node:crypto';

const SCHEME = 'v1';

/** The window published in the API docs for a merchant's own verifier to use. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * A standalone reimplementation of the platform's `App\Support\Webhooks\WebhookSignature::verify()`
 * (app/Support/Webhooks/WebhookSignature.php) — this package cannot depend on
 * the Laravel application, so the scheme is duplicated here. Keep the two in
 * sync: `t={unix},v1={hex}` over `hmac_sha256("{t}.{payload}", secret)`.
 *
 * Node-only: webhook verification is inherently server-side, since the
 * endpoint secret it needs is the same server-side secret an API key is.
 */
export function verifyWebhookSignature(
    payload: string,
    secret: string,
    header: string,
    toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): boolean {
    const parts = parse(header);
    const timestamp = parts.t;
    const presented = parts[SCHEME];

    if (timestamp === undefined || presented === undefined) {
        return false;
    }

    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSeconds) {
        return false;
    }

    const expected = digest(payload, secret, timestamp);

    return safeEqual(expected, presented);
}

function digest(payload: string, secret: string, timestamp: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

function parse(header: string): Record<string, string> {
    const parts: Record<string, string> = {};

    for (const pair of header.split(',')) {
        const [key, value] = pair.trim().split('=');
        if (key !== undefined && value !== undefined) {
            parts[key] = value;
        }
    }

    return parts;
}

function safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
}
