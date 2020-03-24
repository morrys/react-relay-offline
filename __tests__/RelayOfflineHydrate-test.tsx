jest.useFakeTimers();

jest.mock("scheduler", () => require.requireActual("scheduler/unstable_mock"));

import * as React from 'react';
//import * as Scheduler from 'scheduler';
const Scheduler = require('scheduler')

//import { ReactRelayContext } from "react-relay";

import { useQuery, RelayEnvironmentProvider, NETWORK_ONLY, Store, RecordSource, Environment, useRestore } from "../src";

import ReactTestRenderer from "react-test-renderer";

//import readContext from "react-relay/lib/readContext";

import {
    createOperationDescriptor,
    Network,
    Observable,
    REF_KEY, ROOT_ID, ROOT_TYPE
} from "relay-runtime";

import {
    generateAndCompile,
    simpleClone
} from "relay-test-utils-internal";
import { createMockEnvironment } from './RelayModernEnvironmentMock';
import { createPersistedStorage } from './Utils';
/*
function expectToBeRendered(renderFn, readyState) {
  // Ensure useEffect is called before other timers
  ReactTestRenderer.act(() => {
    jest.runAllImmediates();
  });
  expect(renderFn).toBeCalledTimes(1);
  expect(renderFn.mock.calls[0][0]).toEqual(readyState);
  renderFn.mockClear();
}*/

const QueryRendererHook = props => {
    const {
        render,
        query,
        variables,
        cacheConfig,
        fetchKey
    } = props;
    const { cached, ...relays } = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        //fetchKey
    });

    return <React.Fragment>{render(relays)}</React.Fragment>;
};

const ReactRelayQueryRenderer = props => (
    <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
);

const NOT_REHYDRATED = "NOT_REHYDRATED";

const QueryRendererUseRestore = (props): any => {

    const rehydrated = useRestore(props.environment);
    if (!rehydrated) {
        return NOT_REHYDRATED;
    }

    return <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ReactRelayQueryRenderer", () => {
    let TestQuery;

    let cacheConfig;
    let environment;
    let render;
    let store;
    let data;
    let initialData;
    let owner;
    let onlineGetter;
    const variables = { id: "4" };
    const restoredState = {
        '4': {
            __id: '4',
            id: '4',
            __typename: 'User',
            name: 'ZUCK',
        },
        'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            'node(id:"4")': { __ref: '4' },
        },
    };
    const propsInitialState = (owner, rehydrated) => {
        return {
            error: null,
            props: {
                node: {
                    id: "4",
                    name: "Zuck",

                    __fragments: {
                        TestFragment: {}
                    },

                    __fragmentOwner: owner.request,
                    __id: "4"
                }
            },
            rehydrated,
            retry: expect.any(Function),
        }
    }
    const propsRestoredState = (owner) => {
        return {
            error: null,
            props: {
                node: {
                    id: "4",
                    name: "ZUCK",

                    __fragments: {
                        TestFragment: {}
                    },

                    __fragmentOwner: owner.request,
                    __id: "4"
                }
            }, rehydrated: true,
            retry: expect.any(Function),
        }
    }

    const loadingStateRehydrated = {
        error: null,
        props: null,
        rehydrated: true,
        retry: expect.any(Function),
        // @ts-ignore
    };

    const loadingStateNotRehydrated = {
        error: null,
        props: null,
        rehydrated: false,
        retry: expect.any(Function),
        // @ts-ignore
    };

    ({ TestQuery } = generateAndCompile(`
                query TestQuery($id: ID = "<default>") {
                    node(id: $id) {
                    id
                    name
                    ...TestFragment
                    }
                }

                fragment TestFragment on User {
                    name
                }
                `));

    owner = createOperationDescriptor(TestQuery, variables);

    beforeEach(async () => {
        Scheduler.unstable_clearYields();
        jest.resetModules();
        expect.extend({
            toBeRendered(readyState) {
                const calls = render.mock.calls;
                expect(calls.length).toBe(1);
                expect(calls[0][0]).toEqual(readyState);
                return { message: '', pass: true };
            }
        });
        data = {
            '4': {
                __id: '4',
                id: '4',
                __typename: 'User',
                name: 'Zuck',
            },
            'client:root': {
                __id: 'client:root',
                __typename: '__Root',
                'node(id:"4")': { __ref: '4' },
            },
        };
        initialData = simpleClone(data);
        render = jest.fn(() => <div />);
    });

    afterEach(async () => {
        // wait for GC to run in setImmediate
        await Promise.resolve();
    });

    describe("rehydrate the environment when online", () => {

        describe("no initial state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage() }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });


            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(loadingStateRehydrated).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(loadingStateNotRehydrated).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                expect(loadingStateRehydrated).toBeRendered();
            });
        });
        describe("initial state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(propsInitialState(owner, true)).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(propsInitialState(owner, false)).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                const calls = render.mock.calls;
                expect(calls.length).toBe(0);
            });
        });

        describe("initial state is different from restored state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({
                    storage: createPersistedStorage(restoredState), initialState: { ...data },
                }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);
                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });

            it("without useRestore", () => {
                console.log("inizio")
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(propsInitialState(owner, false)).toBeRendered();
                
                console.log("inizio state")

                render.mockClear();
                jest.runAllTimers();
                
                console.log("timer")
                expect(propsRestoredState(owner)).toBeRendered();
            });
        });


        describe(" no initial state, with restored state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage(restoredState) }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(loadingStateNotRehydrated).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });
        });
    });

    describe("rehydrate the environment when offline", () => {

        describe("no initial state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage() }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });

                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
            });


            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(loadingStateRehydrated).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(loadingStateNotRehydrated).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                expect(loadingStateRehydrated).toBeRendered();
            });
        });
        describe("initial state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(propsInitialState(owner, true)).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(propsInitialState(owner, false)).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                const calls = render.mock.calls;
                expect(calls.length).toBe(0);
            });
        });

        describe("initial state is different from restored state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage(restoredState), initialState: { ...data } }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });

            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(propsInitialState(owner, false)).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });
        });

        describe(" no initial state, with restored state", () => {

            beforeEach(async () => {
                store = new Store(new RecordSource({ storage: createPersistedStorage(restoredState) }), { storage: createPersistedStorage(), defaultTTL: -1 });
                environment = createMockEnvironment({ store });
            });

            it("with useRestore", () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expect(propsRestoredState(owner)).toBeRendered();
            });

            /*
            if the application is offline, the policy is still store-only and since it has not been modified, 
            the execute is not re-executed and the application is still in a loading state. (We want to avoid it, we want recover restored state)
            */
            it("without useRestore", () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />
                );
                expect(loadingStateNotRehydrated).toBeRendered();

                render.mockClear();
                jest.runAllTimers();
                expect(loadingStateRehydrated).toBeRendered();
            });
        });
    });
});