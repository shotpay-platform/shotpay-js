import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShotPayButton } from '../src/react.js';
import type { ButtonSession } from '../src/types.js';

const session: ButtonSession = { checkout_url: 'https://checkout.shotpay.test/cs_789' };

afterEach(() => {
    cleanup();
    document.getElementById('shotpay-button-styles')?.remove();
});

describe('ShotPayButton', () => {
    it('renders the vanilla button through the wrapper', () => {
        render(<ShotPayButton createSession={async () => session} onSession={() => {}} />);

        expect(screen.getByRole('button', { name: 'Pay with ShotPay' })).toBeTruthy();
    });

    it('hands the opened session to onSession', async () => {
        const onSession = vi.fn();
        render(<ShotPayButton createSession={async () => session} onSession={onSession} />);

        screen.getByRole('button').click();

        await waitFor(() => expect(onSession).toHaveBeenCalledWith(session));
    });

    it('applies prop changes through update()', () => {
        const { rerender } = render(
            <ShotPayButton createSession={async () => session} onSession={() => {}} />,
        );

        rerender(
            <ShotPayButton
                createSession={async () => session}
                onSession={() => {}}
                label="Hold it for me"
                theme="light"
            />,
        );

        const button = screen.getByRole('button', { name: 'Hold it for me' });
        expect(button.getAttribute('data-theme')).toBe('light');
    });

    it('calls the latest createSession closure, not the one from mount time', async () => {
        const first = vi.fn(async () => session);
        const second = vi.fn(async () => session);
        const { rerender } = render(
            <ShotPayButton createSession={first} onSession={() => {}} />,
        );

        rerender(<ShotPayButton createSession={second} onSession={() => {}} />);
        screen.getByRole('button').click();

        await waitFor(() => expect(second).toHaveBeenCalledOnce());
        expect(first).not.toHaveBeenCalled();
    });

    it('removes the button on unmount', () => {
        const { unmount } = render(
            <ShotPayButton createSession={async () => session} onSession={() => {}} />,
        );

        unmount();

        expect(screen.queryByRole('button')).toBeNull();
    });
});
