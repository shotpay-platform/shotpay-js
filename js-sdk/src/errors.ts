export class ShotPayApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly body: Record<string, unknown>,
    ) {
        super(typeof body.message === 'string' ? body.message : `The ShotPay API responded with status ${status}.`);
        this.name = 'ShotPayApiError';
    }
}
