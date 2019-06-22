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

## React Native Example

The [react native offline example]https://github.com/morrys/react-relay-offline-example#react-native

## Environment

```ts
import { Network } from 'relay-runtime';
import { Store, Environment } from 'react-relay-offline';

const network = Network.create(fetchQuery);
const store = new Store();
const environment = new Environment({ network, store });
```

## Environment with Offline Options

```ts
import { Network } from 'relay-runtime';
import { Store, Environment } from 'react-relay-offline';

const network = Network.create(fetchQuery);

const networkOffline = Network.create(fetchQueryOffline);

const offlineOptions = { 
  manualExecution: false, //optional
  network: networkOffline, //optional
  onComplete: (options ) => { //optional
    const { id, offlinePayload, snapshot } = options;
    console.log("onComplete", options);
    return true;
  },
  onDiscard: ( options ) => { //optional
    const { id, offlinePayload , error } = options;
    console.log("onDiscard", options);
    return true;
  }
};
const store = new Store();
const environment = new Environment({ network, store }, offlineOptions);
```

* manualExecution: if set to true, mutations in the queue are no longer performed automatically as soon as you go back online. invoke manually: `environment.getStoreOffline().execute();`

* network: it is possible to configure a different network for the execution of mutations in the queue

* onComplete: function that is called once the mutation has been successfully completed. Only if the function returns the value true, the mutation is deleted from the queue.

* onDiscard: function that is called when the mutation returns an error. Only if the function returns the value true, the mutation is deleted from the queue and the store is rollback



## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```ts
import {Network} from 'relay-runtime';
import EnvironmentIDB from 'react-relay-offline/lib/runtime/EnvironmentIDB';

const network = Network.create(fetchQuery);
const environment = EnvironmentIDB.create({ network });
```

## Environment with PersistOfflineOptions

```ts
import { Network } from 'relay-runtime';
import { Store, Environment } from 'react-relay-offline';
import { CacheOptions } from "@wora/cache-persist";

const network = Network.create(fetchQuery);

const networkOffline = Network.create(fetchQueryOffline);

const persistOfflineOptions: CacheOptions = { 
  prefix: "app-user1"
};
const store = new Store();
const environment = new Environment({ network, store }, {}, persistOfflineOptions);
```

* storage?: CacheStorage;  custom storage
* prefix?: string;  prefix key in storage 
* serialize?: boolean;  if set to true, it performs JSON serialization
* encryption?: boolean;  not yet implemented in @wora/cache-persist

## Store with custom options

```ts
import { Store } from 'react-relay-offline';
import { CacheOptions } from "@wora/cache-persist";

const ttl: number = 10 * 60 * 1000; // default
const persistOptions: CacheOptions = {}; // default
const persistOptionsRecords: CacheOptions = {}; // default
const store = new Store(ttl, persistOptions, persistOptionsRecords);

```


## QueryRenderer

* Add "LoadingComponent" property
* Add "cached" property in render function
* Add CACHE_FIRST in dataFrom, with this property the query is not executed on the network if it        finds valid results in the cache

```ts
import { QueryRenderer } from 'react-relay-offline'; 

<QueryRenderer
        environment={environment}
        query={query}
        variables={{}}
        LoadingComponent={<Loading />}
        render={({ props, error, retry, cached }) => {
```

## Mutation

```ts
import { commitMutation, graphql } from 'react-relay-offline';
```

## Detect Network

```ts
import { useIsConnected } from "react-relay-offline";
import { useNetInfo } from "react-relay-offline";
import { NetInfo } from "react-relay-offline";
```

## Requirement

* Version 3.0.0 or 4.0.0 of the react-relay library
* When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## TODO

* Documentation

* Implementation of Refetch Container Offline (The implementation of the refetchContainer involves the management of fetchPolicy (network-only and store-or-network). To make it homogeneous with the management of the "QueryRenderer" I have to add the cache-first and offline policy), for the moment it is usable only as specified by the Relay library.


## License

React Relay Offline is [MIT licensed](./LICENSE).
