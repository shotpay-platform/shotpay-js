import { vi } from 'vitest';
import type { Contract } from '../src/types.js';

export const fetchMock = vi.fn();

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

/** The URL and init the client passed to `fetch` on its nth call. */
export function callAt(index: number): { url: string; init: RequestInit & { headers: Record<string, string> } } {
    const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit & { headers: Record<string, string> }];

    return { url, init };
}

export function contractPayload(overrides: Partial<Contract> = {}): Contract {
    return {
        reference: 'LAY-XK2M9QPR7V',
        order_reference: 'SO-2026-0042',
        status: 'active',
        customer_name: 'Dana Reyes',
        customer_email: 'dana@example.com',
        customer_state: 'CA',
        total_amount: 100000,
        reservation_fee_amount: 5000,
        customer_total: 105000,
        down_payment_amount: 26250,
        paid_amount: 26250,
        remaining_amount: 78750,
        installments: [
            { sequence: 1, amount: 26250, due_date: '2026-09-25', status: 'paid', paid_at: '2026-09-25T10:00:00.000000Z' },
            { sequence: 2, amount: 26250, due_date: '2026-10-25', status: 'upcoming', paid_at: null },
        ],
        started_at: '2026-08-25T10:00:00.000000Z',
        completed_at: null,
        defaulted_at: null,
        cancelled_at: null,
        created_at: '2026-08-25T09:59:00.000000Z',
        metadata: { sales_rep: 'kim' },
        ...overrides,
    };
}
