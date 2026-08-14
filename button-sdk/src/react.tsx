import { useEffect, useRef } from 'react';
import { mount } from './mount.js';
import type { ButtonSession, ShotPayButtonHandle, ShotPayButtonOptions } from './types.js';

export interface ShotPayButtonProps<S extends ButtonSession = ButtonSession>
    extends ShotPayButtonOptions<S> {
    /** Applied to the host element the button renders into. */
    className?: string;
}

/**
 * React face of `mount()`: mounts the vanilla button once and forwards every
 * render's props through `handle.update()`, so fresh closures for
 * `createSession`/`onSession`/`onError` always win.
 */
export function ShotPayButton<S extends ButtonSession = ButtonSession>({
    className,
    ...options
}: ShotPayButtonProps<S>) {
    const hostRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<ShotPayButtonHandle<S> | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        if (hostRef.current === null) {
            return;
        }

        const handle = mount<S>(hostRef.current, optionsRef.current);
        handleRef.current = handle;

        return () => {
            handleRef.current = null;
            handle.destroy();
        };
    }, []);

    useEffect(() => {
        handleRef.current?.update(options);
    });

    return <div ref={hostRef} className={className} />;
}

export type { ButtonSession, ShotPayButtonOptions } from './types.js';
export { ShotPayButtonError } from './errors.js';
