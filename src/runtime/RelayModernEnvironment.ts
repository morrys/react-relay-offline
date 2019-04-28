import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime/lib';
import { v4 as uuid } from "uuid";

const actions = {
  ENQUEUE: 'ENQUEUE_OFFLINE_MUTATION',
  COMMIT: 'COMMIT_OFFLINE_MUTATION',
  ROLLBACK: 'ROLLBACK_OFFLINE_MUTATION',
};

class RelayModernEnvironment extends Environment {
    private dataFrom = undefined;
    private storeOffline = undefined;

    constructor(config, storeOffline) {
        super(config);
        this.dataFrom = config.dataFrom;
        this.storeOffline = storeOffline;
    }

    public isRehydrated() {
        return this.storeOffline.getState().rehydrated;
      }

      public isOnline() {
      return this.storeOffline.getState().offline.online;
    }

    public getDataFrom() {
      return this.dataFrom;
    }

    public executeMutation({
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
      }): RelayObservable<GraphQLResponse> {
        if (this.isOnline()) {
          return super.executeMutation({
            operation,
            optimisticResponse,
            optimisticUpdater,
            updater,
            uploadables,
          })
        } else {
          return RelayObservable.create(sink => {
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
              (this as any)._publishQueue.applyUpdate(optimisticUpdate);
              (this as any)._publishQueue.run();
            }
            const fetchTime = Date.now();
            const id = uuid();
            this.storeOffline.dispatch({
              type: actions.ENQUEUE,
              payload: { optimisticResponse },
              meta: {
                  offline: {
                    effect: {
                      request: {
                        operation,
                        optimisticResponse
                      },
                      fetchTime: fetchTime,
                      id: id
                    },
                      commit: { type: actions.COMMIT },
                      rollback: { type: actions.ROLLBACK },
                  }
              }
          });
    
            return () => null
          });
        }
    
      }
    


}


export default RelayModernEnvironment;