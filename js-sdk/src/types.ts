/** Mirrors the fields `CheckoutSessionResource` returns from both
 * `POST /v1/sessions` and `GET /v1/checkout-sessions/{id}`. */
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
    /** Your own key/value pairs, as sent on create. `{}` when none were sent. */
    metadata: Record<string, string>;
}

export interface CreateCheckoutSessionParams {
    order_reference: string;
    /** Integer minor units (cents) — send 42900 for $429.00. */
    total_amount: number;
    return_url: string;
    cancel_url: string;
    customer_email?: string | null;
    customer_state?: string | null;
    /**
     * Your own string key/value pairs, echoed back on the session and on the
     * contract it becomes. Max 50 keys; keys 40 chars, values 500.
     */
    metadata?: Record<string, string>;
}

/** `active` may become any of the other three, all of which are terminal. */
export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'defaulted';

/**
 * `upcoming` becomes `due` when its deadline passes, then `paid` once
 * collected. `missed` is a deadline that passed uncollected and can still be
 * settled.
 */
export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'missed';

export interface PlanInstallment {
    sequence: number;
    /** Integer minor units (cents). */
    amount: number;
    /** `YYYY-MM-DD` — a calendar date, not a timestamp. */
    due_date: string;
    status: InstallmentStatus;
    paid_at: string | null;
}

/**
 * Mirrors the fields `App\Http\Resources\V1\ContractResource` returns. Every
 * amount is integer minor units (cents). Identified by `reference` — the same
 * value webhook payloads carry — and deliberately carries no row ids.
 */
export interface Contract {
    reference: string;
    order_reference: string | null;
    status: ContractStatus;
    customer_name: string;
    customer_email: string;
    customer_state: string | null;
    /** The order total before the fee. */
    total_amount: number;
    service_fee_amount: number;
    /** The order total plus the fee — what the plan collects in all. */
    customer_total: number;
    down_payment_amount: number;
    paid_amount: number;
    remaining_amount: number;
    installments: PlanInstallment[];
    started_at: string | null;
    completed_at: string | null;
    defaulted_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    /** Your own key/value pairs. `{}` when none were set. */
    metadata: Record<string, string>;
}

export interface ListContractsParams {
    status?: ContractStatus;
    page?: number;
}

export interface UpdateContractParams {
    order_reference?: string;
    /**
     * Replaces the stored map rather than merging into it — send the full set
     * you want kept, or `null` to clear it. Max 50 keys; keys 40 chars,
     * values 500.
     */
    metadata?: Record<string, string> | null;
}

export type QueryParams = Record<string, string | number | undefined>;

/** The envelope every Laravel API Resource wraps its payload in. */
export interface Resource<T> {
    data: T;
}

/** First, last, previous and next page URLs. Absolute, and filter-preserving. */
export interface PaginationLinks {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
}

/** What Laravel's paginator reports alongside the page it returned. */
export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

/** A `ResourceCollection` over `->paginate()`, as the list endpoints return. */
export interface Paginated<T> {
    data: T[];
    links: PaginationLinks;
    meta: PaginationMeta;
}
