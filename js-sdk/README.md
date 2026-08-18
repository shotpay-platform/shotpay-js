# @shotpay/sdk

A minimal JS/TS client for the ShotPay Checkout API. Covers the checkout
session lifecycle and webhook signature verification — nothing else. For
every other endpoint, call the ShotPay API directly as documented at
`/docs/api`.

## Install

```sh
npm install @shotpay/sdk
```

Requires Node 18 or newer.

**Early access — the `0.x` line is still in progress.** Breaking changes can
land in a minor bump (`0.1.x` → `0.2.0`). A default `^0.1.0` range only
resolves `0.1.x`, so you will not be moved onto a breaking release without
changing the range yourself. Pin an exact version if you want no movement at
all.

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
        total_amount: 49999, // integer cents — $499.99
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
