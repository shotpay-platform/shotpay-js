import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../src/webhooks.js';

const secret = 'whsec_testing';
const payload = '{"id":"evt_1","type":"contract.paid"}';

function sign(body: string, key: string, timestamp: number): string {
    const digest = createHmac('sha256', key).update(`${timestamp}.${body}`).digest('hex');
    return `t=${timestamp},v1=${digest}`;
}

describe('verifyWebhookSignature', () => {
    it('verifies a signature against the bytes it was made from', () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const header = sign(payload, secret, timestamp);

        expect(verifyWebhookSignature(payload, secret, header)).toBe(true);
    });

    it('rejects a payload changed by one byte', () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const header = sign(payload, secret, timestamp);

        expect(verifyWebhookSignature(`${payload} `, secret, header)).toBe(false);
    });

    it('rejects a different secret', () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const header = sign(payload, secret, timestamp);

        expect(verifyWebhookSignature(payload, 'whsec_other', header)).toBe(false);
    });

    it('rejects a delivery older than the tolerance', () => {
        const timestamp = Math.floor(Date.now() / 1000) - 600;
        const header = sign(payload, secret, timestamp);

        expect(verifyWebhookSignature(payload, secret, header, 300)).toBe(false);
    });

    it.each([
        ['empty', ''],
        ['no digest', 't=1786512000'],
        ['no timestamp', 'v1=abc'],
        ['nonsense', 'garbage'],
    ])('rejects a malformed header (%s)', (_name, header) => {
        expect(verifyWebhookSignature(payload, secret, header)).toBe(false);
    });
});
