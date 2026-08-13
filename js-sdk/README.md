# @shotpay/sdk

A minimal JS/TS client for the ShotPay Checkout API. Covers the checkout
session lifecycle and webhook signature verification — nothing else. For
every other endpoint, call the widget API directly as documented at
`/docs/api`.

**Status: early access.** Not yet published to npm. Install from a checkout
of this repository or a git dependency in the meantime.

## Usage

```ts
import { ShotPayClient } from '@shotpay/sdk';

const client = new ShotPayClient({
    clientId: 'mch_live_...',
    apiKey: 'sk_live_...',
});

const session = await client.createCheckoutSession(
    {
        order_reference: 'ORD-1001',
        total_amount: 499.99,
        return_url: 'https://store.example/checkout/complete',
        cancel_url: 'https://store.example/cart',
    },
    'a-uuid-per-checkout-attempt',
);

// Later, from your own server:
const same = await client.retrieveCheckoutSession(session.id);
```

## Verifying a webhook

Node-only — the endpoint secret this needs is a server-side secret, the same
as an API key.

```ts
import { verifyWebhookSignature } from '@shotpay/sdk';

const header = request.headers['shotpay-signature'];
const rawBody = await readRawBody(request); // verify against the raw bytes, not re-serialized JSON

if (!verifyWebhookSignature(rawBody, endpointSecret, header)) {
    throw new Error('Invalid webhook signature');
}
```

`endpointSecret` is shown once, when the endpoint is created or its secret is
rotated, in the merchant dashboard.
