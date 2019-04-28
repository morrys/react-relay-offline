# [React Relay Offline](https://github.com/morrys/react-relay-offline)

React Relay Offline is a extension of [Relay](https://facebook.github.io/relay/) for offline capabilities


## Example

How to create the environment

```
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

## Requirement

When a new node is created by mutation the id must be generated in the browser to use it in the optimistic response

## TODO

Documentation

Fork [relay-examples](https://github.com/relayjs/relay-examples.git)

Implementation of Refetch Container Offline

Publish to npm or create a pull request to the Relay project (i must use flow type)


## License

React Relay Offline is [MIT licensed](./LICENSE).
