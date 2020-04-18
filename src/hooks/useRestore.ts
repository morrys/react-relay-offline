import { useState } from 'react';

export function useRestore(environment): boolean {
    const [rehydratate, setRehydratate] = useState(environment.isRehydrated());

    if (!rehydratate) {
        environment.hydrate().then(() => setRehydratate(environment.isRehydrated()));
    }
    return rehydratate;
}
