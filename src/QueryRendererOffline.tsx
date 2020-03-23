import * as React from 'react';
import QueryRenderer from './QueryRendererHook';
import { RelayEnvironmentProvider } from 'relay-hooks';
import { QueryRendererOfflineProps } from './RelayOfflineTypes';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const QueryRendererOffline = function <T>(props: QueryRendererOfflineProps<T>) {
    const { environment } = props;

    return (
        <RelayEnvironmentProvider environment={environment}>
            <QueryRenderer {...props} />
        </RelayEnvironmentProvider>
    );
};

export default QueryRendererOffline;
