# [React Relay Offline](https://github.com/morrys/react-relay-offline)

React Relay Offline is a extension of [Relay](https://facebook.github.io/relay/) for offline capabilities

## Installation

Install react-relay and react-relay-offline using yarn or npm:

```
yarn add react-relay react-relay-offline
```


## React Web Example

The [relay-offline-examples](https://github.com/morrys/relay-examples) repository is a fork of [relay-examples](https://github.com/relayjs/relay-examples) and contains an integration of react-relay-offline. To try it out:

```
git clone https://github.com/morrys/relay-examples.git
cd relay-examples/todo
yarn
yarn build
yarn start
```

Then, just point your browser at `http://localhost:3000`.



How to create the environment

```
import { Network } from 'relay-runtime';
import { OfflineStore, Store, Environment, RecordSource } from 'react-relay-offline';

const network = Network.create(fetchQuery);
const storeOffline = OfflineStore(network);
const source = new RecordSource(storeOffline);
const store = new Store(storeOffline, source);
const modernEnvironment = new Environment({ network, store, dataFrom: "CACHE_FIRST" }, storeOffline);
```

Change the renderer 

```
import {QueryRenderer} from 'react-relay-offline'; 
```

## React Native Example

How to create the environment

```
import { Network } from 'relay-runtime';
import { OfflineStore, Store, Environment, RecordSource } from 'react-relay-offline';

const network = Network.create(fetchQuery);
const storeOffline = OfflineStore(network);
const source = new RecordSource(storeOffline);
const store = new Store(storeOffline, source);
const modernEnvironment = new Environment({ network, store, dataFrom: "CACHE_FIRST" }, storeOffline);
```

Change the renderer 

```
import {QueryRenderer} from 'react-relay-offline'; 
```

In QueryRenderer you need to set the property LoadingComponent.

## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```
import OfflineStore from 'react-relay-offline/lib/runtime/redux/OfflineStoreIDB'
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

```
<QueryRenderer
        environment={environment}
        query={query}
        variables={{}}
        LoadingComponent={<Loading />}
        render={({ props, error, retry, cached }) => {
```

## Hooks

```
const hooksProps = useQuery(props);
```

## Requirement

* Version 3.0.0 or 4.0.0 of the react-relay library
* When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## TODO

Documentation

Implementation of Refetch Container Offline

Create a pull request to the Relay project (i must use flow type)


## License

React Relay Offline is [MIT licensed](./LICENSE).
