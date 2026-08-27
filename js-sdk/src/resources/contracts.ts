import type { HttpTransport } from '../transport.js';
import type { Contract, ListContractsParams, Paginated, UpdateContractParams } from '../types.js';

/**
 * Your layaway agreements after checkout, addressed by the reference webhooks
 * carry. Reads need a key with the `contracts:read` scope; `update` and
 * `cancel` need `contracts:write`.
 */
export class Contracts {
    constructor(private readonly transport: HttpTransport) {}

    /**
     * `GET /v1/contracts`. Newest first, one page at a time. Page size is
     * fixed by the API and is not a parameter; step through with `page`,
     * stopping when `meta.current_page` reaches `meta.last_page`.
     */
    list(params: ListContractsParams = {}): Promise<Paginated<Contract>> {
        return this.transport.page<Contract>('GET', '/v1/contracts', { query: { ...params } });
    }

    /** `GET /v1/contracts/{reference}`. One agreement with its full schedule. */
    retrieve(reference: string): Promise<Contract> {
        return this.transport.object<Contract>('GET', `/v1/contracts/${encodeURIComponent(reference)}`);
    }

    /**
     * `PATCH /v1/contracts/{reference}`. Corrects bookkeeping only — money,
     * status and the customer's identity are not writable. `metadata` replaces
     * the stored map rather than merging into it.
     */
    update(reference: string, params: UpdateContractParams): Promise<Contract> {
        return this.transport.object<Contract>('PATCH', `/v1/contracts/${encodeURIComponent(reference)}`, {
            body: params,
        });
    }

    /**
     * `POST /v1/contracts/{reference}/cancel`. No further installments are
     * collected; paid installments stay paid. Cancelling an already-cancelled
     * agreement answers with the agreement as it stands, so a retry is safe —
     * but one that already completed or defaulted raises a 422.
     */
    cancel(reference: string): Promise<Contract> {
        return this.transport.object<Contract>('POST', `/v1/contracts/${encodeURIComponent(reference)}/cancel`);
    }
}
