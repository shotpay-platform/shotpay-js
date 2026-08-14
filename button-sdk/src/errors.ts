export class ShotPayButtonError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly body?: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'ShotPayButtonError';
    }
}
