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
import * as ErrorUtils from 'fbjs/lib/ErrorUtils';
import * as RelayRecordSourceMutator from 'relay-runtime/lib/RelayRecordSourceMutator';
import * as RelayRecordSourceProxy from 'relay-runtime/lib/RelayRecordSourceProxy';
import * as RelayReader from 'relay-runtime/lib/RelayReader';
import * as normalizeRelayPayload from 'relay-runtime/lib/normalizeRelayPayload';

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
    const { configs } = config;


    const backup = new RelayInMemoryRecordSource();
    let sinkPublish = new RelayInMemoryRecordSource()
    if (optimisticResponse || optimisticUpdater) {
        const sink = new RelayInMemoryRecordSource();
        const mutator = new RelayRecordSourceMutator(
            environment.getStore().getSource(),
            sink,
            backup
        );
        const store = new RelayRecordSourceProxy(mutator, environment._getDataID);
        const response = optimisticResponse || null;
        const selectorStoreUpdater = optimisticUpdater;
        const selectorStore = store.commitPayload(operation, response);
        // TODO: Fix commitPayload so we don't have to run normalize twice
        let selectorData, source;
        if (response) {
            ({ source } = normalizeRelayPayload(
                operation.root,
                response,
                null,
                { getDataID: this._getDataID },
            ));
            selectorData = RelayReader.read(source, operation.fragment, operation).data;
        }
        selectorStoreUpdater &&
            ErrorUtils.applyWithGuard(
                selectorStoreUpdater,
                null,
                [selectorStore, selectorData],
                null,
                'RelayPublishQueue:applyUpdates',
            );
    }
    if (optimisticResponse) {
        var payload = normalizeResponse({ data: optimisticResponse },
            operation.root,
            ROOT_TYPE,
            [],
            environment._getDataID,
        );
        const {fieldPayloads, source} = payload;
        // updater only for configs
        sinkPublish = environment._publishQueue._getSourceFromPayload({fieldPayloads, operation, source, updater});
        //environment._publishQueue.commitPayload(operation, payload, configs ? updater : null);
        //environment._publishQueue.run();


    }
    /*
    //environment.
    //environment.applyUpdate(optimisticUpdate);*/

    if (!configs && optimisticUpdater) {
        const mutator = new RelayRecordSourceMutator(
            environment.getStore().getSource(),
            sinkPublish,
        );
        const store = new RelayRecordSourceProxy(mutator, environment._getDataID);
        ErrorUtils.applyWithGuard(
            optimisticUpdater,
            null,
            [store],
            null,
            'RelayPublishQueue:commitUpdaters',
        );
        /*    
        if (optimisticUpdater != null) {
            optimisticUpdater(environment.getStore());
        }
        if (updater) {
            updater(environment.getStore())
        }*/
    }
    
    environment.getStore().publish(sinkPublish);
    environment.getStore().notify()

    //const fetchTime = Date.now();
    //const id = uuid();
    environment.getStoreOffline().dispatch({
        operation,
        optimisticResponse,
        uploadables,
        backup,
        sinkPublish
    });
    return { dispose: () => { } };
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
    ): Disposable {
        const resolver = resolveMutation(environment, config);
        if (environment.isOnline()) {
            return executeOnline(environment, config, resolver);
        } else {
            return executeOffline(environment, config, resolver);
        }
    }

    return mutate;

}

export default useMutation;
