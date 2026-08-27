import { ShotPayApiError } from './errors.js';
import type { Paginated, QueryParams } from './types.js';

export interface RequestOptions {
    /** Serialised to JSON, which also sets `Content-Type`. Omit for a bodyless call. */
    body?: unknown;
    /** `undefined` values are dropped rather than sent as the string "undefined". */
    query?: QueryParams;
    headers?: Record<string, string>;
}

/**
 * The HTTP layer the resource classes share. Internal: the shape of a request
 * is not part of this package's public surface, and holding it apart from
 * `ShotPayClient` is what lets a resource reach the network without importing
 * the client back.
 */
export class HttpTransport {
    private readonly baseUrl: string;

    constructor(
        private readonly clientId: string,
        private readonly apiKey: string,
        baseUrl: string,
    ) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    /**
     * A `{ data: … }` envelope, unwrapped to the object inside. A body that is
     * not that shape raises with status `200` — the request succeeded, the
     * response did not say what it claimed to.
     */
    async object<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
        const payload = await this.send(method, path, options);
        const data = (payload as { data?: unknown }).data;

        if (data === undefined) {
            throw new ShotPayApiError(200, { message: 'The ShotPay API returned a response without a `data` object.' });
        }

        return data as T;
    }

    /** A `{ data: […], links, meta }` envelope, returned whole. */
    async page<T>(method: string, path: string, options: RequestOptions = {}): Promise<Paginated<T>> {
        const payload = (await this.send(method, path, options)) as Partial<Paginated<T>>;

        if (!Array.isArray(payload.data)) {
            throw new ShotPayApiError(200, { message: 'The ShotPay API returned a page without a `data` array.' });
        }

        return payload as Paginated<T>;
    }

    private async send(method: string, path: string, options: RequestOptions): Promise<unknown> {
        const hasBody = options.body !== undefined;

        const response = await fetch(`${this.baseUrl}${path}${query(options.query)}`, {
            method,
            headers: {
                'X-Client-Id': this.clientId,
                'X-Api-Key': this.apiKey,
                Accept: 'application/json',
                ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers,
            },
            body: hasBody ? JSON.stringify(options.body) : undefined,
        });

        const payload = await decode(response);

        if (!response.ok) {
            throw new ShotPayApiError(response.status, payload);
        }

        return payload;
    }
}

/**
 * Read as text and parse by hand: a 429 with an empty body and a 502 carrying a
 * proxy's HTML both reach here, and `response.json()` would throw a SyntaxError
 * over the status the caller actually needs to see.
 */
async function decode(response: Response): Promise<Record<string, unknown>> {
    const text = await response.text();

    if (text === '') {
        return {};
    }

    try {
        return JSON.parse(text) as Record<string, unknown>;
    } catch {
        return { message: text };
    }
}

function query(params: QueryParams | undefined): string {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
        if (value !== undefined) {
            search.set(key, String(value));
        }
    }

    const encoded = search.toString();

    return encoded === '' ? '' : `?${encoded}`;
}
