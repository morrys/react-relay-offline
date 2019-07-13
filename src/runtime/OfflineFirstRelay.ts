import { CacheOptions } from "@wora/cache-persist";
import { v4 as uuid } from "uuid";
import {  Network, } from 'relay-runtime/lib/RelayStoreTypes';
import RelayModernEnvironment from './RelayModernEnvironment';
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
import { GraphQLResponseWithData } from 'relay-runtime/lib/RelayNetworkTypes';
import {
    NormalizationSelector,
    RelayResponsePayload
} from 'relay-runtime/lib/RelayStoreTypes';

import { Observable as RelayObservable } from 'relay-runtime';
import OfflineFirst, { OfflineFirstOptions, OfflineRecordCache, Request } from "@wora/offline-first";


export type Payload = {
    operation: any,
    optimisticResponse?: any,
    uploadables?: any,
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, "execute"> & {
    network?: Network;
};


class RelayStoreOffline {

    
    public static create<Payload>(environment: RelayModernEnvironment, 
        persistOptions: CacheOptions = {}, 
        offlineOptions: OfflineOptions<Payload> = {},): OfflineFirst<Payload> {
            const persistOptionsStoreOffline = {
                prefix: 'relay-offline',
                serialize: true,
                ...persistOptions,
            };

            const { 
                onComplete, 
                onDiscard, 
                network, 
                manualExecution, 
                finish,
                onPublish
             } = offlineOptions;
    
            const options: OfflineFirstOptions<Payload> = {
                manualExecution,
                execute: (offlineRecord: any) => executeMutation(environment, network, offlineRecord),
                onComplete: (options: any) => complete(environment, onComplete, options),
                onDiscard: (options: any) => discard(environment, onDiscard, options),
            }
            if(onPublish) {
                options.onPublish = onPublish;
            }
            if(finish) {
                options.finish = finish;
            }
            return new OfflineFirst(options, persistOptionsStoreOffline);    
    }
}



    

function complete(environment, onComplete = (options => true), options: { offlineRecord: OfflineRecordCache<Payload>, response: any }) {
    const { offlineRecord, response } = options;
    const { request: { payload }, id } = offlineRecord;
    const operation = payload.operation;
    const snapshot = environment.lookup(operation.fragment);
    return onComplete({ id, offlinePayload: offlineRecord, snapshot: (snapshot.data as any), response });

}

function discard(environment, onDiscard = (options => true), options: { offlineRecord: OfflineRecordCache<Payload>, error: any }) {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    if (onDiscard({ id, offlinePayload: offlineRecord, error })) {
        const { request: { backup } } = offlineRecord;
        environment.getStore().publish(backup);
        environment.getStore().notify();
        return true;
    } else {
        return false;
    }
}

async function executeMutation(environment, network, offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
    const { request: { payload }, id } = offlineRecord;
    const operation = payload.operation;
    const uploadables = payload.uploadables;
    return network.execute(
        operation.node.params,
        operation.variables,
        { force: true },
        uploadables,
    ).toPromise();
}

export function publish(environment, mutationOptions) {
    return RelayObservable.create(sink => {
        const {
            operation,
            optimisticResponse,
            optimisticUpdater,
            updater,
            uploadables,
        } = mutationOptions;


        const backup = new RelayInMemoryRecordSource();
        
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
                    { getDataID: environment._getDataID },
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
        let sinkPublish = new RelayInMemoryRecordSource()
        if (optimisticResponse) {
            var normalizePayload = normalizeResponse({ data: optimisticResponse },
                operation.root,
                ROOT_TYPE,
                [],
                environment._getDataID,
            );
            const { fieldPayloads, source } = normalizePayload;
            // updater only for configs
            sinkPublish = environment._publishQueue._getSourceFromPayload({ fieldPayloads, operation, source, updater });
            //environment._publishQueue.commitPayload(operation, payload, configs ? updater : null);
            //environment._publishQueue.run();


        }
        /*
        //environment.
        //environment.applyUpdate(optimisticUpdate);*/

        if (!optimisticResponse && optimisticUpdater) {
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
        const id = uuid();
        const payload: Payload = {
            operation,
            optimisticResponse,
            uploadables,
        };
        const request:Request<Payload> = {
            payload,
            backup,
            sink: sinkPublish
        };
        environment.getStoreOffline().publish({ id, request, serial: true }).then(offlineRecord => {
            environment.getStore().publish(sinkPublish);
            environment.getStore().notify();
            environment.getStoreOffline().notify();
            sink.next(offlineRecord);
            sink.complete();
        }).catch(error => {
            sink.error(error, true)
        });
    });
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

export default RelayStoreOffline;