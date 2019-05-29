# [React Relay Offline](https://github.com/morrys/react-relay-offline)

React Relay Offline is a extension of [Relay](https://facebook.github.io/relay/) for offline capabilities

## Installation

Install react-relay and react-relay-offline using yarn or npm:

```
yarn add react-relay react-relay-offline
```


## React Web Example

The [react-relay-offline-example](https://github.com/morrys/react-relay-offline-example) contains an integration of react-relay-offline. To try it out:

```
git clone https://github.com/morrys/react-relay-offline-example.git
cd react-relay-offline-example/todo
yarn
yarn build
yarn start
```

Then, just point your browser at `http://localhost:3000`.



How to create the environment

```ts
import { Network } from 'relay-runtime';
import { OfflineStore, Store, Environment, RecordSource } from 'react-relay-offline';

const network = Network.create(fetchQuery);
const storeOffline = OfflineStore(network);
const source = new RecordSource(storeOffline);
const store = new Store(storeOffline, source);
const modernEnvironment = new Environment({ network, store }, storeOffline);
```

Change the renderer 

```ts
import {QueryRenderer} from 'react-relay-offline'; 
```

## React Native Example

How to create the environment

```ts
import { Network } from 'relay-runtime';
import { OfflineStore, Store, Environment, RecordSource } from 'react-relay-offline';

const network = Network.create(fetchQuery);
const storeOffline = OfflineStore(network);
const source = new RecordSource(storeOffline);
const store = new Store(storeOffline, source);
const modernEnvironment = new Environment({ network, store }, storeOffline);
```

Change the renderer 

```ts
import {QueryRenderer} from 'react-relay-offline'; 
```

In QueryRenderer you need to set the property LoadingComponent.

## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```ts
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
* Add CACHE_FIRST in dataFrom, with this property the query is not executed on the network if it        finds valid results in the cache

```ts
<QueryRenderer
        environment={environment}
        query={query}
        variables={{}}
        LoadingComponent={<Loading />}
        render={({ props, error, retry, cached }) => {
```

## Mutation

To allow offline modifications use the mutation of this library as follows:

```ts
import { commitMutation, graphql, Disposable, Environment } from 'react-relay-offline';
const mutation = graphql`
  mutation AddTodoMutation($input: AddTodoInput!) {
    addTodo(input: $input) {
      todoEdge {
        __typename
        cursor
        node {
          complete
          id
          text
        }
      }
      user {
        id
        totalCount
      }
    }
  }
`;


function commit(
  environment: Environment,
  text: string,
  user: TodoApp_user,
): Disposable {
  const totalCount = user.totalCount + 1;
  const idTot = totalCount+user.completedCount;
  const clientMutationId = Buffer.from('Todo:' + idTot, 'utf8').toString('base64');
  const input: AddTodoInput = {
    text,
    userId: user.userId,
    clientMutationId: clientMutationId,
  };
  
  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    optimisticResponse: {
      addTodo: {
        todoEdge: {
          node: {
            id: clientMutationId, 
            text: text,
            complete: false
          },
          cursor: null,
          __typename: "TodoEdge"
        },
        user: {
          id: user.id,
          totalCount: totalCount
        }
      }
    },
    configs: [{
      type: 'RANGE_ADD',
      parentID: user.id,
      connectionInfo: [{
        key: 'TodoList_todos',
        rangeBehavior: 'append',
      }],
      edgeName: 'todoEdge',
    }],
  });
}

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
