const assert = require('node:assert/strict');

const node = require('@shotpay/node');
const button = require('@shotpay/button');
const react = require('@shotpay/button/react');

assert.equal(typeof node.ShotPayClient, 'function');
assert.equal(typeof node.verifyWebhookSignature, 'function');
assert.equal(typeof button.mount, 'function');
assert.equal(typeof react.ShotPayButton, 'function');

console.log('CJS entry points ok');
