/** Mirrors the fields `CheckoutSessionResource` returns from both
 * `POST /widget/sessions` and `GET /widget/checkout-sessions/{id}`. */
export interface CheckoutSession {
    id: string;
    status: 'pending' | 'decision_made' | 'completed' | 'cancelled' | 'expired';
    order_reference: string;
    /** Integer minor units (cents) — 42900 is $429.00. */
    total_amount: number;
    down_payment_amount: number;
    down_payment_percentage: number;
    checkout_url: string;
    return_url: string;
    cancel_url: string;
    expires_at: string;
    created_at: string;
}

export interface CreateCheckoutSessionParams {
    order_reference: string;
    /** Integer minor units (cents) — send 42900 for $429.00. */
    total_amount: number;
    return_url: string;
    cancel_url: string;
    customer_email?: string | null;
    customer_state?: string | null;
}
