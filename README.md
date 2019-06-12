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

How to create the environment

## React Native Example

How to create the environment

```ts
import { Network } from 'relay-runtime';
import { Store, Environment } from 'react-relay-offline';

const network = Network.create(fetchQuery);
function callbackOffline(type: string, payload: any, error: any) {
  console.log("callbackoffline", type)
  console.log("callbackoffline", payload)
  console.log("callbackoffline", error)
}
const store = new Store();
const environment = new Environment({ network, store }, callbackOffline);
```

Change the renderer 

```ts
import {QueryRenderer} from 'react-relay-offline'; 
```

In QueryRenderer you need to set the property LoadingComponent.

## Environment

```ts
import { Network } from 'relay-runtime';
import { Store, Environment } from 'react-relay-offline';

const network = Network.create(fetchQuery);
function callbackOffline(type: string, payload: any, error: any) {
  console.log("callbackoffline", type) //next, complete, error, discard, start
  console.log("callbackoffline", payload)
  console.log("callbackoffline", error)
}
const store = new Store();
const environment = new Environment({ network, store }, callbackOffline);
```

## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```ts
import {Network} from 'relay-runtime';
import EnvironmentIDB from 'react-relay-offline/lib/runtime/EnvironmentIDB';

const network = Network.create(fetchQuery);
function callbackOffline(type: string, payload: any, error: any) {
  console.log("callbackoffline", type)
  console.log("callbackoffline", payload)
  console.log("callbackoffline", error)
}
const environment = EnvironmentIDB.create({ network }, callbackOffline);
```

## OfflineStore

It is possible to customize the offline store through these parameters:

* storage: any
* keyPrefix: string
* customWhitelist: string[]
* serialize: boolean
* customReducers: ReducersMapObject


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
```

## Requirement

* Version 3.0.0 or 4.0.0 of the react-relay library
* When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## TODO

* Documentation

* Implementation of Refetch Container Offline (The implementation of the refetchContainer involves the management of fetchPolicy (network-only and store-or-network). To make it homogeneous with the management of the "QueryRenderer" I have to add the cache-first and offline policy), for the moment it is usable only as specified by the Relay library.

* Create a pull request to the Relay project (i must use flow type)


## License

React Relay Offline is [MIT licensed](./LICENSE).
