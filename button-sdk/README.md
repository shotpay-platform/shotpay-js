# @shotpay/button

A browser-side ShotPay button. Covers rendering the button and asking **your
server** to open the checkout session — nothing else. Opening the session is
your server's job because that is where the API key lives; the button never
sees ShotPay credentials, and once it has a session it sends the customer to
the hosted checkout with a top-level redirect.

## Install

```sh
npm install @shotpay/button
```

React is an optional peer dependency — install it only if you import
`@shotpay/button/react`.

**Early access — the `0.x` line is still in progress.** Breaking changes can
land in a minor bump (`0.1.x` → `0.2.0`). A default `^0.1.0` range only
resolves `0.1.x`, so you will not be moved onto a breaking release without
changing the range yourself. Pin an exact version if you want no movement at
all.

## Usage

```ts
import { mount } from '@shotpay/button';

mount(document.querySelector('#shotpay'), {
    // A URL on your server that opens the session (with @shotpay/node or a
    // direct call to POST /v1/sessions) and responds with it.
    endpoint: '/shotpay/create-session',
});
```

The endpoint receives `POST {}` with an `Idempotency-Key` header — pass it
through to ShotPay so a retried click cannot open two sessions — and responds
with the session, bare or wrapped in a `data` envelope; `checkout_url` is the
only field the button reads. When the request needs your own payload (a cart
id, an amount), take over the call with `createSession` instead:

```ts
mount(element, {
    createSession: async ({ idempotencyKey }) => {
        const response = await fetch('/shotpay/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
            body: JSON.stringify({ cart: cartId }),
        });

        return response.json(); // null aborts quietly, e.g. after failed validation
    },
});
```

## In React

```tsx
import { ShotPayButton } from '@shotpay/button/react';

<ShotPayButton
    createSession={openSessionOnYourServer}
    onSession={(session) => setSession(session)} // omit to get the default redirect
/>;
```

## What stays on your server

The session-opening call, the API key it is signed with, and the
[handshake](/docs/guides/handshake) that marks the order paid. The button is
only the trigger: it guards against double clicks, mints the idempotency key,
and performs the redirect. One page requirement: it injects a `<style>`
element, so a CSP must allow inline styles for `style-src`.

The label, theme (`dark`/`light`), loading text, size, shape, and logo
visibility are configurable; the palette and the mark's geometry are not —
that is the point of shipping a button.
