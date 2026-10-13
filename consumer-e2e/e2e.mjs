// Live e2e through the *installed* packages. Skipped without SHOTPAY_E2E_*,
// which shotpay-platform's sdk-e2e-js CI job exports after booting itself.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ShotPayClient, verifyWebhookSignature } from '@shotpay/node';
import { mount } from '@shotpay/button';

const baseUrl = process.env.SHOTPAY_E2E_BASE_URL;

if (!baseUrl) {
    console.log('SHOTPAY_E2E_BASE_URL not set — live e2e skipped');
    process.exit(0);
}

const client = new ShotPayClient({
    clientId: process.env.SHOTPAY_E2E_CLIENT_ID,
    apiKey: process.env.SHOTPAY_E2E_API_KEY,
    baseUrl,
});

const session = await client.checkoutSessions.create({
    order_reference: `CONSUMER-${Math.random().toString(16).slice(2)}`,
    total_amount: 49999,
    customer_state: 'TX',
    return_url: 'https://example.test/return',
    cancel_url: 'https://example.test/cancel',
});
assert.ok(session.id.startsWith('cs_'));
assert.equal((await client.checkoutSessions.retrieve(session.id)).id, session.id);

const reference = process.env.SHOTPAY_E2E_CONTRACT_REFERENCE;
assert.equal((await client.contracts.retrieve(reference)).reference, reference);

assert.equal(
    verifyWebhookSignature(
        process.env.SHOTPAY_E2E_WEBHOOK_PAYLOAD,
        process.env.SHOTPAY_E2E_WEBHOOK_SECRET,
        process.env.SHOTPAY_E2E_WEBHOOK_SIGNATURE,
    ),
    true,
);

// The merchant flow end to end: the button's createSession is the merchant's
// own server, which opens a real session with the node SDK.
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
const opened = await new Promise((resolve, reject) => {
    mount(dom.window.document.getElementById('root'), {
        createSession: () =>
            client.checkoutSessions.create({
                order_reference: `BUTTON-${Math.random().toString(16).slice(2)}`,
                total_amount: 49999,
                customer_state: 'TX',
                return_url: 'https://example.test/return',
                cancel_url: 'https://example.test/cancel',
            }),
        onSession: resolve,
        onError: reject,
    });

    dom.window.document.querySelector('.shotpay-button').click();
});
assert.ok(opened.checkout_url.includes(opened.id));

console.log('live e2e through the installed packages ok');
