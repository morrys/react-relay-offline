/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @emails oncall+relay
 */

'use strict';

jest.mock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));

import * as React from 'react';
//import * as Scheduler from 'scheduler';
const Scheduler = require('scheduler');

//import { ReactRelayContext } from "react-relay";

import { useQuery, Store, RecordSource, Environment } from '../src';
import { RelayEnvironmentProvider, NETWORK_ONLY } from 'relay-hooks';

import * as ReactTestRenderer from 'react-test-renderer';

//import readContext from "react-relay/lib/readContext";

import { createOperationDescriptor, graphql, Network, Observable, ROOT_ID } from 'relay-runtime';

import { ROOT_TYPE } from 'relay-runtime/lib/store/RelayStoreUtils';

import { createMockEnvironment, createPersistedStore, createPersistedRecordSource } from '../src-test';

const NextQueryGenerated = graphql`
    query ReactRelayQueryRendererTestNextQuery($id: ID!) {
        node(id: $id) {
            ... on User {
                name
            }
        }
    }
`;

const loadingState = {
    error: null,
    data: null,
    retry: expect.any(Function),
    isLoading: true,
};

function expectToBeRendered(
    renderSpy,
    readyState: {
        data: any;
        error: Error | null;
    },
): void {
    // Ensure useEffect is called before other timers

    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    expect(renderSpy).toBeCalledTimes(2);

    expect(renderSpy.mock.calls[0][0].isLoading).toEqual(true);
    expect(renderSpy.mock.calls[0][0].error).toEqual(null);

    const actualResult = renderSpy.mock.calls[1][0];
    expect(renderSpy.mock.calls[1][0].isLoading).toEqual(false);

    expect(actualResult.data).toEqual(readyState.data);
    expect(actualResult.error).toEqual(readyState.error);
    expect(actualResult.retry).toEqual(expect.any(Function));
}

function expectToBeLoading(renderSpy): void {
    // Ensure useEffect is called before other timers

    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    expect(renderSpy).toBeCalledTimes(1);

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(true);
    expect(actualResult.error).toEqual(null);
    expect(actualResult.data).toEqual(null);
}

function expectToBeError(renderSpy, error): void {
    // Ensure useEffect is called before other timers

    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    expect(renderSpy).toBeCalledTimes(1);

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(false);
    expect(actualResult.error).toEqual(error);
    expect(actualResult.data).toEqual(null);
}

function expectToBeRenderedFirst(
    renderSpy,
    readyState: {
        data: any;
        error: Error | null;
        isLoading?: boolean;
    },
): void {
    // Ensure useEffect is called before other timers

    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    expect(renderSpy).toBeCalledTimes(1);
    const { isLoading = false } = readyState;

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(isLoading);

    expect(actualResult.data).toEqual(readyState.data);
    expect(actualResult.error).toEqual(readyState.error);
    expect(actualResult.retry).toEqual(expect.any(Function));
}

const QueryRendererHook = (props: any): JSX.Element => {
    const { render, fetchPolicy = NETWORK_ONLY, query, variables, cacheConfig, fetchKey, skip } = props;
    const queryData = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        fetchPolicy,
        fetchKey,
        skip,
    });

    return <React.Fragment>{render(queryData)}</React.Fragment>;
};

const ReactRelayQueryRenderer = (props: any): JSX.Element => (
    <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
);

/*function sleep(ms): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}*/

describe('ReactRelayQueryRenderer', () => {
    let TestQuery;

    let cacheConfig;
    let environment;
    let render;
    let store;
    let variables;

    const response = {
        data: {
            node: {
                __typename: 'User',
                id: '4',
                name: 'Zuck',
            },
        },
    };

    class PropsSetter extends React.Component<any, any> {
        constructor(props) {
            super(props);
            this.state = {
                props: null,
            };
        }

        setProps(props) {
            this.setState({ props });
        }

        render() {
            const child: any = React.Children.only(this.props.children);
            if (this.state.props) {
                return React.cloneElement(child, this.state.props);
            }
            return child;
        }
    }

    beforeEach(() => {
        Scheduler.unstable_clearYields();
        jest.resetModules();

        environment = createMockEnvironment();
        store = environment.getStore();
        const frag = graphql`
            fragment ReactRelayQueryRendererTestFragment on User {
                name
            }
        `;
        TestQuery = graphql`
            query ReactRelayQueryRendererTestQuery($id: ID = "<default>") {
                node(id: $id) {
                    id
                    ...ReactRelayQueryRendererTestFragment
                }
            }
        `;

        render = jest.fn(() => <div />);
        variables = { id: '4' };
        environment.hydrate();
        jest.runAllTimers();
    });

    afterEach(async () => {
        // wait for GC to run in setImmediate
        await Promise.resolve();
    });

    describe('when initialized', () => {
        it('skip', () => {
            let renderer;
            ReactTestRenderer.act(() => {
                renderer = ReactTestRenderer.create(
                    <PropsSetter>
                        <ReactRelayQueryRenderer
                            query={TestQuery}
                            cacheConfig={cacheConfig}
                            environment={environment}
                            render={render}
                            variables={variables}
                            skip={true}
                        />
                    </PropsSetter>,
                );
                jest.runAllImmediates();
            });
            expect(environment.execute.mock.calls.length).toBe(0);
            environment.mockClear();
            render.mockClear();
            ReactTestRenderer.act(() => {
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                    skip: false,
                });
                jest.runAllImmediates();
            });

            expect(environment.execute.mock.calls.length).toBe(1);
            render.mockClear();
            ReactTestRenderer.act(() => {
                environment.mock.resolve(TestQuery, response);
                jest.runAllImmediates();
            });
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRenderedFirst(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
            });
        });

        it('fetches the query', () => {
            ReactTestRenderer.create(
                <ReactRelayQueryRenderer
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );
            expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
        });
        describe('when constructor fires multiple times', () => {
            describe('when store does not have snapshot and fetch does not return snapshot', () => {
                it('fetches the query only once, renders loading state', () => {
                    environment.mockClear();
                    function Child(props) {
                        // NOTE the unstable_yield method will move to the static renderer.
                        // When React sync runs we need to update this.

                        Scheduler.unstable_yieldValue(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        cacheConfig={cacheConfig}
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    const renderer = ReactTestRenderer.create(<Example />, {
                        unstable_isConcurrent: true,
                    });

                    // Flush some of the changes, but don't commit
                    Scheduler.unstable_flushNumberOfYields(2);
                    expect(Scheduler.unstable_clearYields()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);
                    expectToBeLoading(render);
                    expect(environment.execute.mock.calls.length).toBe(1);
                    render.mockClear();

                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });
                    expect(environment.execute.mock.calls.length).toBe(1);
                    expectToBeLoading(render);
                });
            });

            describe('when store has a snapshot', () => {
                it('fetches the query only once, renders snapshot from store', () => {
                    environment.mockClear();
                    environment.applyUpdate({
                        storeUpdater: (_store) => {
                            let root = _store.get(ROOT_ID);
                            if (!root) {
                                root = _store.create(ROOT_ID, ROOT_TYPE);
                            }
                            const user = _store.create('4', 'User');
                            user.setValue('4', 'id');
                            user.setValue('Zuck', 'name');
                            root.setLinkedRecord(user, 'node', { id: '4' });
                        },
                    });

                    function Child(props) {
                        // NOTE the unstable_yield method will move to the static renderer.
                        // When React sync runs we need to update this.
                        Scheduler.unstable_yieldValue(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        fetchPolicy="store-and-network"
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    const renderer = ReactTestRenderer.create(<Example />, {
                        unstable_isConcurrent: true,
                    });
                    const owner = createOperationDescriptor(TestQuery, variables);

                    // Flush some of the changes, but don't commit
                    Scheduler.unstable_flushNumberOfYields(2);
                    expect(Scheduler.unstable_clearYields()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);

                    expectToBeRenderedFirst(render, {
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        error: null,
                        isLoading: true,
                    });
                    expect(environment.execute.mock.calls.length).toBe(1);
                    render.mockClear();

                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });
                    expect(environment.execute.mock.calls.length).toBe(1);
                    expectToBeRenderedFirst(render, {
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        isLoading: true,
                    });
                });
            });
            describe('when fetch returns a response synchronously first time', () => {
                it('fetches the query once, always renders snapshot returned by fetch', () => {
                    const fetch = jest.fn().mockReturnValueOnce(response);
                    store = new Store(
                        new RecordSource({ storage: createPersistedRecordSource() }),
                        {
                            storage: createPersistedStore(),
                        },
                        { queryCacheExpirationTime: null },
                    );
                    environment = new Environment({
                        network: Network.create(fetch),
                        store,
                    });
                    environment.hydrate();
                    jest.runAllTimers();
                    function Child(props) {
                        // NOTE the unstable_yieldValue method will move to the static renderer.
                        // When React sync runs we need to update this.
                        Scheduler.unstable_yieldValue(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        fetchPolicy="store-or-network" // changed, before store-and-network, now not exist anymore cached request in component
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    const renderer = ReactTestRenderer.create(<Example />, {
                        unstable_isConcurrent: true,
                    });
                    const owner = createOperationDescriptor(TestQuery, variables);

                    // Flush some of the changes, but don't commit
                    Scheduler.unstable_flushNumberOfYields(2);
                    expect(Scheduler.unstable_clearYields()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);
                    expectToBeRenderedFirst(render, {
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                    });
                    expect(fetch.mock.calls.length).toBe(1);
                    render.mockClear();

                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });
                    expect(fetch.mock.calls.length).toBe(1);
                    expectToBeRenderedFirst(render, {
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                    });
                });
            });
            describe('when variables change before first result has completed', () => {
                it('correctly renders data for new variables', () => {
                    environment = createMockEnvironment();
                    environment.hydrate();
                    jest.runAllTimers();
                    let pendingRequests = [];
                    jest.spyOn(environment, 'execute').mockImplementation((request: any) => {
                        const nextRequest: any = { request };
                        pendingRequests = pendingRequests.concat([nextRequest]);
                        return Observable.create((sink) => {
                            nextRequest.resolve = (resp) => {
                                environment.commitPayload(request.operation, resp.data);
                                sink.next(resp);
                                sink.complete();
                            };
                        });
                    });
                    let renderer;
                    ReactTestRenderer.act(() => {
                        renderer = ReactTestRenderer.create(
                            <PropsSetter>
                                <ReactRelayQueryRenderer
                                    environment={environment}
                                    query={TestQuery}
                                    render={render}
                                    variables={variables}
                                    cacheConfig={{ force: true }}
                                />
                            </PropsSetter>,
                        );
                        jest.runAllImmediates();
                    });
                    render.mockClear();
                    expect(environment.execute).toBeCalledTimes(1);
                    expect(pendingRequests.length).toEqual(1);

                    const firstRequest = pendingRequests[0];
                    const firstOwner = firstRequest.request.operation;
                    ReactTestRenderer.act(() => {
                        firstRequest.resolve(response);
                    });
                    expectToBeRenderedFirst(render, {
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: firstOwner.request,
                                __id: '4',
                            },
                        },
                    });
                    render.mockClear();

                    renderer.getInstance().setProps({
                        variables: { id: '5' },
                    });
                    expect(environment.execute).toBeCalledTimes(2);
                    expect(pendingRequests.length).toEqual(2);

                    renderer.getInstance().setProps({
                        variables: { id: '6' },
                    });
                    expect(environment.execute).toBeCalledTimes(3);
                    expect(pendingRequests.length).toEqual(3);

                    const secondRequest = pendingRequests[1];
                    const secondResponse = {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '5',
                                name: 'Other',
                            },
                        },
                    };
                    const thirdRequest = pendingRequests[2];
                    const thirdOwner = thirdRequest.request.operation;
                    const thirdResponse = {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '6',
                                name: 'Third',
                            },
                        },
                    };

                    // Resolve the latest request first, and the earlier request last
                    // The query renderer should render the data from the latest
                    // request
                    thirdRequest.resolve(thirdResponse);
                    secondRequest.resolve(secondResponse);
                    expect(render.mock.calls.length).toEqual(3);
                    const lastRender = render.mock.calls[2][0];
                    expect(lastRender).toEqual({
                        error: null,
                        data: {
                            node: {
                                id: '6',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: thirdOwner.request,
                                __id: '6',
                            },
                        },
                        isLoading: false,
                        retry: expect.any(Function),
                    });
                });
            });

            it('fetches the query with default variables', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={{}}
                    />,
                );
                variables = { id: '<default>' };
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
            });

            it('renders with a default ready state', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );

                expectToBeLoading(render);
            });

            it('if initial render set from store, skip loading state when data for query is already available', () => {
                environment.applyUpdate({
                    storeUpdater: (_store) => {
                        let root = _store.get(ROOT_ID);
                        if (!root) {
                            root = _store.create(ROOT_ID, ROOT_TYPE);
                        }
                        const user = _store.create('4', 'User');
                        user.setValue('4', 'id');
                        user.setValue('Zuck', 'name');
                        root.setLinkedRecord(user, 'node', { id: '4' });
                    },
                });

                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        fetchPolicy="store-and-network"
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                const owner = createOperationDescriptor(TestQuery, variables);
                expectToBeRenderedFirst(render, {
                    error: null,
                    isLoading: true,
                    data: {
                        node: {
                            id: '4',
                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                });
            });

            it('skip loading state when request could be resolved synchronously', () => {
                const fetch = () => response;
                store = new Store(
                    new RecordSource({ storage: createPersistedRecordSource() }),
                    {
                        storage: createPersistedStore(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = new Environment({
                    network: Network.create(fetch),
                    store,
                });
                environment.hydrate();
                jest.runAllTimers();
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                const owner = createOperationDescriptor(TestQuery, variables);
                expectToBeRenderedFirst(render, {
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                });
            });

            it('skip loading state when request failed synchronously', () => {
                const error = new Error('Mock Network Error');
                const fetch: any = () => error;
                store = new Store(
                    new RecordSource({ storage: createPersistedRecordSource() }),
                    {
                        storage: createPersistedStore(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = new Environment({
                    network: Network.create(fetch),
                    store,
                });
                environment.hydrate();
                jest.runAllTimers();
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expectToBeError(render, error);
            });
        });

        describe('when new props are received', () => {
            let renderer;

            beforeEach(() => {
                renderer = ReactTestRenderer.create(
                    <PropsSetter>
                        <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                    </PropsSetter>,
                );
            });

            it('does not update if all props are ===', () => {
                environment.mockClear();
                render.mockClear();

                // "update" with all === props
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.execute).not.toBeCalled();
                expect(render).toBeCalled(); // expect(render).not.toBeCalled(); changed hooks renderer with same result
            });

            it('does not update if variables are equivalent', () => {
                variables = { foo: [1] };
                renderer = ReactTestRenderer.create(
                    <PropsSetter>
                        <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                    </PropsSetter>,
                );
                environment.mockClear();
                render.mockClear();

                // Update with equivalent variables
                variables = { foo: [1] };
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.execute).not.toBeCalled();
                expect(render).toBeCalled(); // expect(render).not.toBeCalled(); changed hooks renderer with same result
            });

            it('updates if `render` prop changes', () => {
                render.mock.calls[0][0]; // changed, now retry is not null
                environment.mockClear();
                render.mockClear();

                // update with new render prop
                render = jest.fn(() => <div />);
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                // added

                expectToBeLoading(render);
                expect(environment.execute).not.toBeCalled();
            });

            it('refetches if the `environment` prop changes', () => {
                expect.assertions(5);
                environment.mock.resolve(TestQuery, {
                    data: {
                        node: null,
                    },
                });
                render.mockClear();

                // Update with a different environment
                environment.mockClear();
                environment = createMockEnvironment();
                environment.hydrate();
                jest.runAllTimers();
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);

                expectToBeLoading(render);
            });

            it('refetches if the `variables` prop changes', () => {
                expect.assertions(5);
                environment.mock.resolve(TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                // Update with different variables
                variables = { id: 'beast' };
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
                expectToBeLoading(render);
            });

            it('refetches with default values if the `variables` prop changes', () => {
                expect.assertions(5);
                environment.mock.resolve(TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                // Update with different variables
                variables = {}; // no `id`
                const expectedVariables = { id: '<default>' };
                renderer.getInstance().setProps({
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, expectedVariables, cacheConfig)).toBe(true);
                expectToBeLoading(render);
            });

            it('refetches if the `query` prop changes', () => {
                expect.assertions(5);
                environment.mock.resolve(TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                // Update with a different query
                const NextQuery = NextQueryGenerated;
                renderer.getInstance().setProps({
                    cacheConfig,
                    environment,
                    query: NextQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
                expectToBeLoading(render);
            });
        });
    });

    describe('when the fetch fails', () => {
        beforeEach(() => {
            ReactTestRenderer.create(
                <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />,
            );
        });

        it('retains immediately', () => {
            expect.assertions(1);
            render.mockClear();
            environment.mock.reject(TestQuery, new Error('fail'));
            expect(environment.retain.mock.calls.length).toBe(1);
        });

        it('renders the error and retry', () => {
            expect.assertions(4);
            render.mockClear();
            const error = new Error('fail');
            environment.mock.reject(TestQuery, error);
            expectToBeError(render, error);
        });

        it('refetch the query if `retry`', () => {
            expect.assertions(8);
            render.mockClear();
            const error = new Error('network fails');

            ReactTestRenderer.act(() => {
                environment.mock.reject(TestQuery, error);
            });
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);

            render.mockClear();
            ReactTestRenderer.act(() => {
                readyState.retry();
            });
            // removed, now retry only try on network and forceupdate after call ending
            const calls = render.mock.calls;
            expect(calls.length).toBe(1);
            expect(calls[0][0]).toEqual(loadingState);

            render.mockClear();
            ReactTestRenderer.act(() => {
                environment.mock.resolve(TestQuery, response);
            });
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRenderedFirst(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });
    });

    describe('with two identical query fetchers', () => {
        // Regression test for T32896427
        describe('when the fetch succeeds', () => {
            it('renders the query results', () => {
                const mockA = jest.fn().mockReturnValue('A');
                const mockB = jest.fn().mockReturnValue('B');
                class Example extends React.Component {
                    render() {
                        return (
                            <React.Fragment>
                                <ReactRelayQueryRenderer
                                    query={TestQuery}
                                    cacheConfig={cacheConfig}
                                    environment={environment}
                                    render={mockA}
                                    variables={variables}
                                />
                                <ReactRelayQueryRenderer
                                    query={TestQuery}
                                    cacheConfig={cacheConfig}
                                    environment={environment}
                                    render={mockB}
                                    variables={variables}
                                />
                            </React.Fragment>
                        );
                    }
                }
                let renderer;
                ReactTestRenderer.act(() => {
                    renderer = ReactTestRenderer.create(<Example />);
                });
                expect.assertions(11);
                mockA.mockClear();
                mockB.mockClear();
                ReactTestRenderer.act(() => {
                    environment.mock.resolve(TestQuery, response);
                });
                const owner = createOperationDescriptor(TestQuery, variables);
                expectToBeRenderedFirst(mockA, {
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    //retry: expect.any(Function),
                });
                expectToBeRenderedFirst(mockB, {
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    //retry: expect.any(Function),
                });
                expect(renderer.toJSON()).toEqual(['A', 'B']);
            });
        });
    });

    describe('when the fetch succeeds', () => {
        beforeEach(() => {
            ReactTestRenderer.create(
                <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />,
            );
        });

        it('retains the result', () => {
            expect.assertions(2);
            environment.mock.resolve(TestQuery, response);
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            environment.mock.resolve(TestQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });

        it('renders the query results', () => {
            expect.assertions(5);
            render.mockClear();
            environment.mock.resolve(TestQuery, response);
            const owner = createOperationDescriptor(TestQuery, variables);

            expectToBeRenderedFirst(render, {
                error: null,
                data: {
                    node: {
                        id: '4',
                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
            });
        });

        it('subscribes to the root fragment', () => {
            expect.assertions(4);
            environment.mock.resolve(TestQuery, response);
            expect(environment.subscribe).toBeCalled();
            expect(environment.subscribe.mock.calls[0][0].selector.dataID).toBe('client:root');
            expect(environment.subscribe.mock.calls[0][0].selector.node).toBe(TestQuery.fragment);
            expect(environment.subscribe.mock.calls[0][0].selector.variables).toEqual(variables);
        });
    });
    describe('when props change during a fetch', () => {
        let NextQuery;
        let renderer;
        let nextProps;

        beforeEach(() => {
            NextQuery = NextQueryGenerated;

            variables = { id: '4' };
            renderer = ReactTestRenderer.create(
                <PropsSetter>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </PropsSetter>,
            );
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('cancels the pending fetch', () => {
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            renderer.getInstance().setProps(nextProps);
            expect(subscription.closed).toBe(true);
        });

        it('releases the pending selection', () => {
            environment.mock.resolve(TestQuery, response);
            const disposeHold = environment.retain.mock.dispose;
            expect(disposeHold).not.toBeCalled();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, response);
            expect(disposeHold).toBeCalled();
        });

        it('retains the new selection', () => {
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, response);
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
        });

        it('renders a pending state', () => {
            render.mockClear();
            renderer.getInstance().setProps(nextProps);
            expectToBeLoading(render);
        });
    });

    describe('when props change after a fetch fails', () => {
        let NextQuery;
        let error;
        let renderer;
        let nextProps;

        beforeEach(() => {
            NextQuery = NextQueryGenerated;

            variables = { id: '4' };
            renderer = ReactTestRenderer.create(
                <PropsSetter>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </PropsSetter>,
            );
            error = new Error('fail');
            environment.mock.reject(TestQuery, error);
            render.mockClear();
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('fetches the new query', () => {
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
        });

        it('retains the new selection', () => {
            expect.assertions(5);
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, {
                data: {
                    node: null,
                },
            });
            expect(environment.retain.mock.calls.length).toBe(1);
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('renders the pending state', () => {
            renderer.getInstance().setProps(nextProps);
            expectToBeLoading(render);
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });
    });

    describe('when props change after a fetch succeeds', () => {
        let NextQuery;
        let renderer;
        let nextProps;

        beforeEach(() => {
            NextQuery = NextQueryGenerated;

            renderer = ReactTestRenderer.create(
                <PropsSetter>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </PropsSetter>,
            );
            environment.mock.resolve(TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                    },
                },
            });
            render.mockClear();
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('disposes the root fragment subscription', () => {
            const disposeUpdate = environment.subscribe.mock.dispose;
            expect(disposeUpdate).not.toBeCalled();
            renderer.getInstance().setProps(nextProps);
            expect(disposeUpdate).toBeCalled();
        });

        it('fetches the new query', () => {
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
        });

        it('disposes the previous selection and retains the new one', () => {
            expect.assertions(6);
            const prevDispose = environment.retain.mock.dispose;
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, {
                data: {
                    node: null,
                },
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
            expect(prevDispose).toBeCalled();
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('renders the pending and previous state', () => {
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);

            expectToBeLoading(render);
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            environment.mockClear();
            renderer.getInstance().setProps(nextProps);
            environment.mock.resolve(NextQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });
    });

    describe('when unmounted', () => {
        it('releases its reference if unmounted before fetch completes', () => {
            const renderer = ReactTestRenderer.create(
                <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />,
            );
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            const dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            renderer.unmount();
            expect(dispose).toBeCalled();
        });

        it('releases its reference if unmounted after fetch completes', () => {
            const renderer = ReactTestRenderer.create(
                <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />,
            );
            environment.mock.resolve(TestQuery, response);
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            const dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            renderer.unmount();
            expect(dispose).toBeCalled();
        });

        it('aborts a pending fetch', () => {
            const renderer = ReactTestRenderer.create(
                <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />,
            );
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            renderer.unmount();
            expect(subscription.closed).toBe(true);
        });
    });

    describe('multiple payloads', () => {
        let NextQuery;
        let renderer;
        let nextProps;

        beforeEach(() => {
            NextQuery = NextQueryGenerated;

            renderer = ReactTestRenderer.create(
                <PropsSetter>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </PropsSetter>,
            );
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });
    });

    describe('async', () => {
        // Verify the component doesn't leak references if it doesn't finish mount.
        // @TODO T28041408 Test aborted mount using unstable_flushSync() rather than
        // throwing once the test renderer exposes such a method.
        it('should ignore data changes before mount', () => {
            class ErrorBoundary extends React.Component<any, any> {
                state = { error: null };
                componentDidCatch(error) {
                    this.setState({ error });
                }

                render() {
                    return this.state.error === null ? this.props.children : null;
                }
            }

            render.mockImplementation(() => {
                const error: any = Error('Make mount fail intentionally');
                // Don't clutter the test console with React's error log
                error.suppressReactErrorLogging = true;
                throw error;
            });

            ReactTestRenderer.create(
                <ErrorBoundary>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </ErrorBoundary>,
            );

            environment.mock.resolve(TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                    },
                },
            });

            expect(render.mock.calls).toHaveLength(1);
        });
    });

    describe('When retry', () => {
        it('uses the latest variables after initial render', () => {
            const renderer = ReactTestRenderer.create(
                <PropsSetter>
                    <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                </PropsSetter>,
            );
            environment.mock.resolve(TestQuery, response);
            environment.mockClear();

            renderer.getInstance().setProps({
                cacheConfig,
                environment,
                query: TestQuery,
                render,
                variables: { id: '5' },
            });
            render.mockClear();
            environment.mock.resolve(TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '5',
                        name: 'Zuck',
                    },
                },
            });
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            expect(environment.execute).toBeCalledTimes(1);
            environment.mockClear();

            readyState.retry();
            expect(environment.execute).toBeCalledTimes(1);
            expect(environment.mock.getMostRecentOperation().request.variables).toEqual({
                id: '5',
            });
        });

        it('skips cache if `force` is set to true', () => {
            ReactTestRenderer.act(() => {
                ReactTestRenderer.create(
                    <PropsSetter>
                        <ReactRelayQueryRenderer environment={environment} query={TestQuery} render={render} variables={variables} />
                    </PropsSetter>,
                );
            });
            render.mockClear();

            ReactTestRenderer.act(() => {
                environment.mock.resolve(TestQuery, response);
            });

            expect(render).toBeCalledTimes(1);
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            environment.mockClear();

            readyState.retry({ force: true });
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(true);
            jest.runAllTimers();
            environment.mockClear();
            readyState.retry();
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(false);
        });

        it('uses cache if `force` is set to false', () => {
            ReactTestRenderer.act(() => {
                ReactTestRenderer.create(
                    <PropsSetter>
                        <ReactRelayQueryRenderer
                            environment={environment}
                            query={TestQuery}
                            render={render}
                            variables={variables}
                            cacheConfig={{ force: true }}
                        />
                    </PropsSetter>,
                );
            });
            render.mockClear();
            ReactTestRenderer.act(() => {
                environment.mock.resolve(TestQuery, response);
            });

            expect(render).toBeCalledTimes(1);
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            environment.mockClear();

            readyState.retry({ force: false });
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(false);
            jest.runAllTimers();
            environment.mockClear();
            readyState.retry();
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(true);
        });
    });

    /*
  describe("fetch key", () => {
    let renderer;
    const fetchKey = 'fetchKey';

    beforeEach(() => {
      renderer = ReactTestRenderer.create(
        <PropsSetter>
          <ReactRelayQueryRenderer
            environment={environment}
            query={TestQuery}
            render={render}
            variables={variables}
            fetchKey={fetchKey}
            fetchPolicy="network-only"
          />
        </PropsSetter>
      );
    });


    it("does not refetches if the `fetchKey` prop not changes", () => {
      expect.assertions(2);
      expect(environment.execute.mock.calls.length).toBe(1);
      render.mockClear();
      environment.mockClear();
      
      renderer.getInstance().setProps({
        environment,
        query: TestQuery,
        render,
        variables,
        fetchKey
      });
      expect(environment.execute.mock.calls.length).toBe(0);
    });

    it("refetches if the `fetchKey` prop changes", () => {
      expect.assertions(2);
      expect(environment.execute.mock.calls.length).toBe(1);
      environment.mockClear();
      render.mockClear();

      renderer.getInstance().setProps({
        environment,
        query: TestQuery,
        render,
        variables,
        fetchKey: "refetchKey"
      });
      expect(environment.execute.mock.calls.length).toBe(1);
    });
   });*/
});
