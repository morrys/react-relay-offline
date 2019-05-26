/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

import { convert } from 'relay-runtime/lib/RelayDeclarativeMutationConfig';
import * as warning from 'fbjs/lib/warning';

import { PayloadError, UploadableMap, GraphQLResponseWithData } from 'relay-runtime/lib/RelayNetworkTypes';
import { GraphQLTaggedNode } from 'relay-runtime/lib/RelayModernGraphQLTag';
import {
    Environment,
    SelectorStoreUpdater,
    NormalizationSelector,
    RelayResponsePayload
} from 'relay-runtime/lib/RelayStoreTypes';
import { Disposable, Variables } from 'relay-runtime/lib/RelayRuntimeTypes';
import { DeclarativeMutationConfig } from 'relay-runtime/lib/RelayDeclarativeMutationConfig';
import { ROOT_TYPE } from 'relay-runtime/lib/RelayStoreUtils';
import * as RelayInMemoryRecordSource from 'relay-runtime/lib/RelayInMemoryRecordSource';
import * as RelayModernRecord from 'relay-runtime/lib/RelayModernRecord';
import * as RelayResponseNormalizer from 'relay-runtime/lib/RelayResponseNormalizer';
import { GetDataID } from 'relay-runtime/lib/RelayResponseNormalizer';

export type MutationConfig<T> = {
    configs?: Array<DeclarativeMutationConfig>,
    mutation: GraphQLTaggedNode,
    variables: Variables,
    uploadables?: UploadableMap,
    onCompleted?: (response: T, errors: Array<PayloadError>) => void,
    onError?: (error: Error) => void,
    optimisticUpdater?: SelectorStoreUpdater,
    optimisticResponse?: Object,
    updater?: SelectorStoreUpdater,
    //onOffline?
};

import { v4 as uuid } from "uuid";

const actions = {
    ENQUEUE: 'ENQUEUE_OFFLINE_MUTATION',
    COMMIT: 'COMMIT_OFFLINE_MUTATION',
    ROLLBACK: 'ROLLBACK_OFFLINE_MUTATION',
};

export function resolveMutation<T>(
    environment: Environment,
    config: MutationConfig<T>,
) {
    const { createOperationDescriptor, getRequest } = environment.unstable_internal;
    const mutation = getRequest(config.mutation);
    if (mutation.params.operationKind !== 'mutation') {
        throw new Error('commitRelayModernMutation: Expected mutation operation');
    }
    if (mutation.kind !== 'Request') {
        throw new Error(
            'commitRelayModernMutation: Expected mutation to be of type request',
        );
    }
    let { optimisticResponse, optimisticUpdater, updater } = config;
    const { configs, onError, variables, uploadables } = config;
    const operation = createOperationDescriptor(mutation, variables);
    // TODO: remove this check after we fix flow.
    if (typeof optimisticResponse === 'function') {
        optimisticResponse = optimisticResponse();
        warning(
            false,
            'commitRelayModernMutation: Expected `optimisticResponse` to be an object, ' +
            'received a function.',
        );
    }
    if (configs) {
        ({ optimisticUpdater, updater } = convert(
            configs,
            mutation,
            optimisticUpdater,
            updater,
        ));
    }
    return {
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
    };
}

function normalizeResponse(
    response: GraphQLResponseWithData,
    selector: NormalizationSelector,
    typeName: string,
    path: ReadonlyArray<string>,
    getDataID: GetDataID,
): RelayResponsePayload {
    const { data, errors } = response;
    const source = new RelayInMemoryRecordSource();
    const record = RelayModernRecord.create(selector.dataID, typeName);
    source.set(selector.dataID, record);
    const normalizeResult = RelayResponseNormalizer.normalize(
        source,
        selector,
        data,
        { handleStrippedNulls: true, path, getDataID },
    );
    return {
        errors,
        incrementalPlaceholders: normalizeResult.incrementalPlaceholders,
        fieldPayloads: normalizeResult.fieldPayloads,
        moduleImportPayloads: normalizeResult.moduleImportPayloads,
        source,
    };
}

export function executeOffline<T>(
    environment: Environment,
    config: MutationConfig<T>,
    resolver: any
): Disposable {
    const {
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
    } = resolver;
    let optimisticUpdate;
    if (optimisticResponse || optimisticUpdater) {
        optimisticUpdate = {
            operation: operation,
            selectorStoreUpdater: optimisticUpdater,
            response: optimisticResponse || null,
        };
    }

    if (optimisticUpdate != null) {
        //TODO fix type
        var payload = normalizeResponse({ data: optimisticResponse },
            operation.root,
            ROOT_TYPE,
            [],
            environment._getDataID,
        );

        environment._publishQueue.commitPayload(operation, payload, updater);
        environment._publishQueue.run();
        //environment.
        //environment.applyUpdate(optimisticUpdate);
    }
    const fetchTime = Date.now();
    const id = uuid();
    environment.getStoreOffline().dispatch({
        type: actions.ENQUEUE,
        payload: { optimisticResponse },
        meta: {
            offline: {
                effect: {
                    request: {
                        operation,
                        optimisticResponse,
                        uploadables
                    },
                    fetchTime: fetchTime,
                    id: id
                },
                commit: { type: actions.COMMIT },
                rollback: { type: actions.ROLLBACK },
            }
        }
    });
}



export function executeOnline<T>(
    environment: Environment,
    config: MutationConfig<T>,
    resolver: any
): Disposable {
    const { operation } = resolver;
    const { onError, onCompleted } = config;
    const errors = [];
    const subscription = environment
        .executeMutation(resolver)
        .subscribe({
            next: payload => {
                if (payload.errors) {
                    errors.push(...payload.errors);
                }
            },
            complete: () => {
                if (onCompleted) {
                    const snapshot = environment.lookup(operation.fragment, operation);
                    onCompleted(
                        (snapshot.data as any),
                        errors.length !== 0 ? errors : null,
                    );
                }
            },
            error: onError,
        });
    return { dispose: subscription.unsubscribe };

}



function useMutation() {

    function mutate<T>(
        environment: Environment,
        config: MutationConfig<T>,
    ) {
        const resolver = resolveMutation(environment, config);
        if (environment.isOnline()) {
            executeOnline(environment, config, resolver);
        } else {
            executeOffline(environment, config, resolver);
        }
    }

    return mutate;

}

export default useMutation;
