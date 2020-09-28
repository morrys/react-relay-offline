import { useState, useEffect, useRef } from 'react';
import * as areEqual from 'fbjs/lib/areEqual';
import { OfflineRecordCache } from '@wora/offline-first';
import { Payload, Environment } from '@wora/relay-offline';
import { useRelayEnvironment } from 'relay-hooks';

export function useOffline(): ReadonlyArray<OfflineRecordCache<Payload>> {
    const ref = useRef();
    const environment = useRelayEnvironment<Environment>();
    const [state, setState] = useState<ReadonlyArray<OfflineRecordCache<Payload>>>(environment.getStoreOffline().getListMutation());

    useEffect(() => {
        const dispose = environment.getStoreOffline().subscribe((nextState, _action) => {
            if (!areEqual(ref.current, nextState)) {
                ref.current = nextState;
                setState(nextState);
            }
        });
        return (): void => {
            dispose();
        };
    }, []);

    return state;
}
