import { useState, useEffect, useRef, useContext } from 'react';
import { ReactRelayContext } from 'react-relay';
import { RelayContext } from 'relay-runtime';
import * as areEqual from 'fbjs/lib/areEqual';
import { OfflineRecordCache } from '@wora/offline-first';
import { Payload } from '@wora/relay-offline';

function useOffline(): ReadonlyArray<OfflineRecordCache<Payload>> {
    const ref = useRef();
    const { environment }: RelayContext = useContext(ReactRelayContext);
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

export default useOffline;
