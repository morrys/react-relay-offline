---
id: react-relay-offline
title: Getting Started
---

# [React Relay Offline](https://github.com/morrys/react-relay-offline)

React Relay Offline is a extension of [Relay](https://facebook.github.io/relay/) for offline capabilities

## Installation React Web

Install react-relay and react-relay-offline using yarn or npm:

```
yarn add react-relay react-relay-offline
```

## Installation React Native

Install react-relay and react-relay-offline using yarn or npm:

```
yarn add @react-native-community/netinfo react-relay react-relay-offline
```

You then need to do some extra configurations to run netinfo package with React Native. Please check [@react-native-community/netinfo official README.md](https://github.com/react-native-netinfo/react-native-netinfo#using-react-native--060) to get the full step guide.

## Main Additional Features

- automatic persistence and rehydration of the store (AsyncStorage, localStorage, IndexedDB)

- configuration of persistence

  - custom storage

  - different key prefix (multi user)

  - serialization: JSON or none

- fetchPolicy network-only, store-and-network, store-or-network, store-only

- management and utilities for network detection

- automatic use of the policy **store-only** when the application is offline

- optimization in store management and addition of **TTL** to queries in the store

- offline mutation management

  - backup of mutation changes

  - update and publication of the mutation changes in the store

  - persistence of mutation information performed

  - automatic execution of mutations persisted when the application returns online

  - configurability of the offline mutation execution network

  - onComplete callback of the mutation performed successfully

  - onDiscard callback of the failed mutation

## Contributing

- **Give a star** to the repository and **share it**, you will **help** the **project** and the **people** who will find it useful

- **Create issues**, your **questions** are a **valuable help**

- **PRs are welcome**, but it is always **better to open the issue first** so as to **help** me and other people **evaluating it**

- **Please sponsor me**

### Sponsors

<a href="https://memorangapp.com" target="_blank"><img height=40px src="https://github.com/morrys/react-relay-offline/raw/master/docs/assets/memorang-logo.png" alt="Memorang">

## react-relay-offline examples

The [offline-examples](https://github.com/morrys/offline-examples) repository contains example projects on how to use react-relay-offline:

  * `nextjs-ssr-preload`: using the render-as-you-fetch pattern with loadQuery in SSR contexts
  * `nextjs`: using the QueryRenderer in SSR contexts
  * `react-native/todo-updater`: using QueryRender in an RN application
  * `todo-updater`: using the QueryRender
  * `suspense/cra`: using useLazyLoadQuery in a CRA
  * `suspense/nextjs-ssr-preload`: using the render-as-you-fetch pattern with loadLazyQuery in react concurrent + SSR contexts
  * `suspense/nextjs-ssr`: using useLazyLoadQuery in SSR contexts

To try it out!


## Environment

```ts
import { Network } from "relay-runtime";
import { RecordSource, Store, Environment } from "react-relay-offline";

const network = Network.create(fetchQuery);
const recordSource = new RecordSource();
const store = new Store(recordSource);
const environment = new Environment({ network, store });
```

## Environment with Offline Options

```ts
import { Network } from "relay-runtime";
import { RecordSource, Store, Environment } from "react-relay-offline";

const network = Network.create(fetchQuery);

const networkOffline = Network.create(fetchQueryOffline);
const manualExecution = false;

const recordSource = new RecordSource();
const store = new Store(recordSource);
const environment = new Environment({ network, store });
environment.setOfflineOptions({
  manualExecution, //optional
  network: networkOffline, //optional
  start: async mutations => {
    //optional
    console.log("start offline", mutations);
    return mutations;
  },
  finish: async (mutations, error) => {
    //optional
    console.log("finish offline", error, mutations);
  },
  onExecute: async mutation => {
    //optional
    console.log("onExecute offline", mutation);
    return mutation;
  },
  onComplete: async options => {
    //optional
    console.log("onComplete offline", options);
    return true;
  },
  onDiscard: async options => {
    //optional
    console.log("onDiscard offline", options);
    return true;
  },
  onPublish: async offlinePayload => {
    //optional
    console.log("offlinePayload", offlinePayload);
    return offlinePayload;
  }
});
```

- manualExecution: if set to true, mutations in the queue are no longer performed automatically as soon as you go back online. invoke manually: `environment.getStoreOffline().execute();`

- network: it is possible to configure a different network for the execution of mutations in the queue; all the information of the mutation saved in the offline store are inserted into the "metadata" field of the CacheConfig so that they can be used during communication with the server.

* start: function that is called once the request queue has been started.

* finish: function that is called once the request queue has been processed.

* onExecute: function that is called before the request is sent to the network.

* onPublish: function that is called before saving the mutation in the store

* onComplete: function that is called once the request has been successfully completed. Only if the function returns the value true, the request is deleted from the queue.

* onDiscard: function that is called when the request returns an error. Only if the function returns the value true, the mutation is deleted from the queue

## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```ts
import { Network } from "relay-runtime";
import EnvironmentIDB from "react-relay-offline/lib/runtime/EnvironmentIDB";

const network = Network.create(fetchQuery);
const environment = EnvironmentIDB.create({ network });
```

## Environment with PersistOfflineOptions

```ts
import { Network } from "relay-runtime";
import { RecordSource, Store, Environment } from "react-relay-offline";
import { CacheOptions } from "@wora/cache-persist";

const network = Network.create(fetchQuery);

const networkOffline = Network.create(fetchQueryOffline);

const persistOfflineOptions: CacheOptions = {
  prefix: "app-user1"
};
const recordSource = new RecordSource();
const store = new Store(recordSource);
const environment = new Environment({ network, store }, persistOfflineOptions);
```

[CacheOptions](https://morrys.github.io/wora/docs/cache-persist.html#cache-options)

## Store with custom options

```ts
import { Store } from "react-relay-offline";
import { CacheOptions } from "@wora/cache-persist";
import { StoreOptions } from "@wora/relay-store";

const persistOptionsStore: CacheOptions = { };
const persistOptionsRecords: CacheOptions = {};
const relayStoreOptions: StoreOptions = { queryCacheExpirationTime: 10 * 60 * 1000 }; // default
const recordSource = new RecordSource(persistOptionsRecords);
const store = new Store(recordSource, persistOptionsStore, relayStoreOptions);
const environment = new Environment({ network, store });
```


## useQuery

`useQuery` does not take an environment as an argument. Instead, it reads the environment set in the context; this also implies that it does not set any React context.
In addition to `query` (first argument) and `variables` (second argument), `useQuery` accepts a third argument `options`. 

**options**

`fetchPolicy`: determine whether it should use data cached in the Relay store and whether to send a network request. The options are:
  * `store-or-network` (default): Reuse data cached in the store; if the whole query is cached, skip the network request
  * `store-and-network`: Reuse data cached in the store; always send a network request.
  * `network-only`: Don't reuse data cached in the store; always send a network request. (This is the default behavior of Relay's existing `QueryRenderer`.)
  * `store-only`: Reuse data cached in the store; never send a network request.

`fetchKey`: [Optional] A fetchKey can be passed to force a refetch of the current query and variables when the component re-renders, even if the variables didn't change, or even if the component isn't remounted (similarly to how passing a different key to a React component will cause it to remount). If the fetchKey is different from the one used in the previous render, the current query and variables will be refetched.

`networkCacheConfig`: [Optional] Object containing cache config options for the network layer. Note the the network layer may contain an additional query response cache which will reuse network responses for identical queries. If you want to bypass this cache completely, pass {force: true} as the value for this option. **Added the TTL property to configure a specific ttl for the query.**

`skip`: [Optional] If skip is true, the query will be skipped entirely.

`onComplete`: [Optional] Function that will be called whenever the fetch request has completed

```ts
import { useQuery } from "react-relay-offline";
const networkCacheConfig = {
  ttl: 1000
}
const hooksProps = useQuery(query, variables, {
  networkCacheConfig,
  fetchPolicy,
});
```

## useLazyLoadQuery

```ts
import { useQuery } from "react-relay-offline";
const networkCacheConfig = {
  ttl: 1000
}
const hooksProps = useLazyLoadQuery(query, variables, {
  networkCacheConfig,
  fetchPolicy,
});
```

## useRestore & loading

the **useRestore** hook allows you to manage the hydratation of persistent data in memory and to initialize the environment.

**It must always be used before using environement in web applications without SSR & react legacy & react-native.**

**Otherwise, for SSR and react concurrent applications the restore is natively managed by QueryRenderer & useQueryLazyLoad & useQuery.**

```
const isRehydrated = useRestore(environment);
   if (!isRehydrated) {
     return <Loading />;
   }
```

## fetchQuery_DEPRECATED

```ts
import { fetchQuery_DEPRECATED } from "react-relay-offline";
```


## Detect Network

```ts
import { useIsConnected } from "react-relay-offline";
import { useNetInfo } from "react-relay-offline";
import { NetInfo } from "react-relay-offline";
```

## Supports Hooks from relay-hooks

Now you can use hooks (useFragment, usePagination, useRefetch) from [relay-hooks](https://github.com/relay-tools/relay-hooks)

## render-as-you-fetch & usePreloadedQuery

### loadQuery

* input parameters

same as useQuery + environment

* output parameters
  * 
    `next: <TOperationType extends OperationType>(
        environment: Environment,
        gqlQuery: GraphQLTaggedNode,
        variables?: TOperationType['variables'],
        options?: QueryOptions,
    ) => Promise<void>`:  fetches data. A promise returns to allow the await in case of SSR
  * `dispose: () => void`: cancel the subscription and dispose of the fetch
  * `subscribe: (callback: (value: any) => any) => () => void`:  used by the usePreloadedQuery
  * `getValue <TOperationType>(environment?: Environment,) => OfflineRenderProps<TOperationType> | Promise<any>`:  used by the usePreloadedQuery

```ts
import {graphql, loadQuery} from 'react-relay-offline';
import {environment} from ''./environment';

const query = graphql`
  query AppQuery($id: ID!) {
    user(id: $id) {
      name
    }
  }
`;

const prefetch = loadQuery();
prefetch.next(
  environment,
  query,
  {id: '4'},
  {fetchPolicy: 'store-or-network'},
);
// pass prefetch to usePreloadedQuery()
```

### loadLazyQuery

**is the same as loadQuery but must be used with suspense**

### render-as-you-fetch in SSR

In SSR contexts, **not using the useRestore hook** it is necessary to manually invoke the hydrate but without using the await.

This will allow the usePreloadedQuery hook to correctly retrieve the data from the store and once the hydration is done it will be react-relay-offline

to notify any updated data in the store.

```ts
  if (!environment.isRehydrated() && ssr) {
      environment.hydrate().then(() => {}).catch((error) => {});
  }
  prefetch.next(environment, QUERY_APP, variables, {
         fetchPolicy: NETWORK_ONLY,
  });
```

## Requirement

- Version >=11.0.2 of the relay-runtime library
- When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## License

React Relay Offline is [MIT licensed](./LICENSE).
