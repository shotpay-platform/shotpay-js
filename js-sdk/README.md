# @shotpay/node

A JS/TS client for the ShotPay API. Covers the checkout session lifecycle, your
layaway contracts, and webhook signature verification. Every other endpoint
stays callable directly, as documented at `/docs/api`.

## Install

```sh
npm install @shotpay/node
```

Requires Node 18 or newer.

**Early access — the `0.x` line is still in progress.** Breaking changes can
land in a minor bump (`0.2.x` → `0.3.0`). A default `^0.2.0` range only
resolves `0.2.x`, so you will not be moved onto a breaking release without
changing the range yourself. Pin an exact version if you want no movement at
all.

## Usage

```ts
import { ShotPayClient } from '@shotpay/node';

const client = new ShotPayClient({
    clientId: 'mch_live_...',
    apiKey: 'sk_live_...',
});
```

### Checkout sessions

Needs a key with the `checkout:write` scope to open one, `checkout:read` to
read it back.

```ts
const session = await client.checkoutSessions.create(
    {
        order_reference: 'ORD-1001',
        total_amount: 49999, // integer cents — $499.99
        return_url: 'https://store.example/checkout/complete',
        cancel_url: 'https://store.example/cart',
        items: [{ name: 'Hunting Rifle', sku: 'RF-100', quantity: 1, unit_amount: 49999 }],
    },
    'a-uuid-per-checkout-attempt',
);

// Later, from your own server:
const same = await client.checkoutSessions.retrieve(session.id);
```

### Contracts

The agreements a completed checkout becomes, addressed by the reference
webhooks carry. Reads need `contracts:read`; `update` and `cancel` need
`contracts:write`.

```ts
const page = await client.contracts.list({ status: 'active' });

for (const contract of page.data) {
    console.log(contract.reference, contract.remaining_amount);
}

const contract = await client.contracts.retrieve('LAY-XK2M9QPR7V');
```

Page size is fixed by the API. Step through with `page`, stopping when
`meta.current_page` reaches `meta.last_page`:

```ts
let page = await client.contracts.list({ status: 'active' });

while (page.meta.current_page < page.meta.last_page) {
    page = await client.contracts.list({
        status: 'active',
        page: page.meta.current_page + 1,
    });
}
```

Only bookkeeping is writable — money, status and the customer's identity are
not. `metadata` **replaces** the stored map rather than merging into it; send
`null` to clear it.

```ts
await client.contracts.update('LAY-XK2M9QPR7V', {
    order_reference: 'SO-2026-0042',
    metadata: { sales_rep: 'kim' },
});
```

Cancelling stops further collection; installments already paid stay paid.
Cancelling an already-cancelled agreement returns it as it stands, so a retry
is safe — but one that already completed or defaulted raises a `422`.

```ts
await client.contracts.cancel('LAY-XK2M9QPR7V');
```

### Deprecated

`client.createCheckoutSession()` and `client.retrieveCheckoutSession()` still
work and call the same endpoints, but are removed in `0.3.0`. Use
`client.checkoutSessions.create()` and `.retrieve()`.

## Verifying a webhook

Node-only — the endpoint secret this needs is a server-side secret, the same
as an API key.

```ts
import { verifyWebhookSignature } from '@shotpay/node';

const header = request.headers['shotpay-signature'];
const rawBody = await readRawBody(request); // verify against the raw bytes, not re-serialized JSON

if (!verifyWebhookSignature(rawBody, endpointSecret, header)) {
    throw new Error('Invalid webhook signature');
}
```

`endpointSecret` is shown once, when the endpoint is created or its secret is
rotated, in the merchant dashboard.
