import * as React from 'react';
import { QueryRendererHook } from './QueryRendererHook';
import { RelayEnvironmentProvider } from 'relay-hooks';
import { QueryRendererOfflineProps } from './RelayOfflineTypes';
import { OperationType } from 'relay-runtime';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const QueryRendererOffline = function <T extends OperationType>(props: QueryRendererOfflineProps<T>) {
    const { environment } = props;

    return (
        <RelayEnvironmentProvider environment={environment}>
            <QueryRendererHook {...props} />
        </RelayEnvironmentProvider>
    );
};
