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

You then need to link the native parts of the library for the platforms you are using. The easiest way to link the library is using the CLI tool by running this command from the root of your project:

`react-native link @react-native-community/netinfo`

## Main Additional Features

- automatic persistence and rehydration of the store (AsyncStorage, localStorage, IndexedDB)

- configuration of persistence

  - custom storage

  - different key prefix (multi user)

  - serialization: JSON or none

- fetchPolicy network-only, store-and-network, store-or-network, store-only

- management and utilities for network detection

- automatic use of the polity **store-only** when the application is offline

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

## React Web Example

The [react-relay-offline-examples](https://github.com/morrys/react-relay-offline-example) repository contains an integration of react-relay-offline. To try it out:

```
git clone https://github.com/morrys/react-relay-offline-example.git
cd react-relay-offline-example/todo
yarn
yarn build
yarn start
```

Then, just point your browser at `http://localhost:3000`.

or

```
git clone https://github.com/morrys/react-relay-offline-example.git
cd react-relay-offline-example/todo-updater
yarn
yarn build
yarn start
```

Then, just point your browser at `http://localhost:3000`.

## React NextJS Offline SSR Example

The [React NextJS Offline SSR Example](https://github.com/morrys/offline-examples/tree/master/relay/nextjs)

## React Native Example

The [react native offline example](https://github.com/morrys/offline-examples#react-native)

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
import { CacheOptionsStore } from "@wora/relay-store";

const persistOptionsStore: CacheOptionsStore = { defaultTTL: 10 * 60 * 1000 }; // default
const persistOptionsRecords: CacheOptions = {}; // default
const recordSource = new RecordSource(persistOptionsRecords);
const store = new Store(recordSource, persistOptionsStore);
const environment = new Environment({ network, store });
```

## QueryRenderer

- Add "cached" property in render function
- Add "ttl" property in order to change default ttl in store
- `fetchPolicy` determine whether it should use data cached in the Relay store and whether to send a network request. The options are:
  - `store-or-network` (default): Reuse data cached in the store; if the whole query is cached, skip the network request
  - `store-and-network`: Reuse data cached in the store; always send a network request.
  - `network-only`: Don't reuse data cached in the store; always send a network request. (This is the default behavior of Relay's existing `QueryRenderer`.)
  - `store-only`: Reuse data cached in the store; never send a network request.

```ts
import { QueryRenderer } from 'react-relay-offline';

<QueryRenderer
        environment={environment}
        query={query}
        variables={{}}
        fetchPolicy='store-or-network'
        ttl={100000}
        render={({ props, error, retry, cached }) => {
```

## useRestore & loading

the **useRestore** hook allows you to manage the hydratation of persistent data in memory and to initialize the environment.

**It must always be used before using environement in web applications without SSR & react legacy & react-native.**

**Otherwise, for SSR and react concurrent applications the restore is natively managed by useQueryLazyLoad & useQuery.**

```
const isRehydrated = useRestore(environment);
   if (!isRehydrated) {
     return <Loading />;
   }
```

## fetchQuery

```ts
import { fetchQuery } from "react-relay-offline";
```

## Mutation

```ts
import { commitMutation, graphql } from "react-relay-offline";
```

## Detect Network

```ts
import { useIsConnected } from "react-relay-offline";
import { useNetInfo } from "react-relay-offline";
import { NetInfo } from "react-relay-offline";
```

## Supports Hooks from relay-hooks

Now you can use hooks (useFragment, usePagination, useRefetch) from [relay-hooks](https://github.com/relay-tools/relay-hooks)

## useQuery

```ts
import { useQuery } from "react-relay-offline";
const hooksProps = useQuery(query, variables, {
  networkCacheConfig: cacheConfig,
  fetchPolicy,
  ttl
});
```

## useLazyLoadQuery

```ts
import { useQuery } from "react-relay-offline";
const hooksProps = useLazyLoadQuery(query, variables, {
  networkCacheConfig: cacheConfig,
  fetchPolicy,
  ttl
});
```

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

- Version >=8.0.0 of the react-relay library
- When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## License

React Relay Offline is [MIT licensed](./LICENSE).
