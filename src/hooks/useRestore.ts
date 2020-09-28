import { Environment } from '@wora/relay-offline';
import { useState } from 'react';

export function useRestore(environment: Environment): boolean {
    const [rehydratate, setRehydratate] = useState(environment.isRehydrated());

    if (!rehydratate) {
        environment.hydrate().then(() => setRehydratate(environment.isRehydrated()));
    }
    return rehydratate;
}
