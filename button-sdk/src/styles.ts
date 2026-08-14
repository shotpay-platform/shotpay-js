const STYLE_ID = 'shotpay-button-styles';

/**
 * Colors are the ShotPay brand palette (`frontend/src/styles/theme.css`),
 * inlined because this package ships to pages that have none of the
 * platform's tokens. Small red text uses the darker ramp step, not the brand
 * red — the brand red fails AA at text sizes.
 */
const CSS = `
.shotpay-button {
    box-sizing: border-box;
    width: 100%;
    padding: 0.625rem 1.25rem;
    border: 1px solid #090909;
    border-radius: 0.5rem;
    background: #090909;
    color: #fafafa;
    font: inherit;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}
.shotpay-button:focus-visible {
    outline: 2px solid #ff3c00;
    outline-offset: 2px;
}
.shotpay-button[data-theme='light'] {
    background: #fafafa;
    color: #090909;
}
.shotpay-button:disabled {
    opacity: 0.6;
    cursor: default;
}
.shotpay-button__icon {
    display: inline-flex;
}
.shotpay-button__icon svg {
    height: 1.05em;
    width: auto;
}
.shotpay-button[data-loading] .shotpay-button__icon {
    display: none;
}
.shotpay-button[data-loading]::before {
    content: '';
    width: 0.875em;
    height: 0.875em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
}
@media (prefers-reduced-motion: no-preference) {
    .shotpay-button[data-loading]::before {
        animation: shotpay-button-spin 0.7s linear infinite;
    }
}
@keyframes shotpay-button-spin {
    to {
        transform: rotate(360deg);
    }
}
.shotpay-button__error {
    margin: 0.375rem 0 0;
    font-size: 0.875em;
    color: #a92a03;
}
.shotpay-button__error:empty {
    display: none;
}
`;

/**
 * Inserts the button stylesheet once per document. Requires a CSP whose
 * `style-src` permits inline style elements.
 */
export function injectStyles(doc: Document): void {
    if (doc.getElementById(STYLE_ID) !== null) {
        return;
    }

    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.appendChild(style);
}
