import * as React from 'react';
import { QueryRendererHook } from './QueryRendererHook';
import { RelayEnvironmentProvider } from 'relay-hooks';
import { QueryRendererOfflineProps } from './RelayOfflineTypes';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const QueryRendererOffline = function <T>(props: QueryRendererOfflineProps<T>) {
    const { environment } = props;

    return (
        <RelayEnvironmentProvider environment={environment}>
            <QueryRendererHook {...props} />
        </RelayEnvironmentProvider>
    );
};
