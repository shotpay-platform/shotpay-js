import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ShotPayClient, ShotPayApiError, verifyWebhookSignature } from '@shotpay/node';
import { mount, ShotPayButtonError } from '@shotpay/button';
import { ShotPayButton } from '@shotpay/button/react';

assert.equal(typeof ShotPayClient, 'function');
assert.equal(typeof ShotPayApiError, 'function');
assert.equal(typeof verifyWebhookSignature, 'function');
assert.equal(typeof mount, 'function');
assert.equal(typeof ShotPayButtonError, 'function');
assert.equal(typeof ShotPayButton, 'function');

for (const file of [
    'node_modules/@shotpay/node/dist/index.d.ts',
    'node_modules/@shotpay/button/dist/index.d.ts',
    'node_modules/@shotpay/button/dist/react.d.ts',
]) {
    assert.ok(existsSync(file), `${file} is missing from the installed package`);
}

assert.ok(
    !existsSync('node_modules/@shotpay/node/src') && !existsSync('node_modules/@shotpay/button/src'),
    'source files should not ship in the packages',
);

console.log('ESM entry points and types ok');
