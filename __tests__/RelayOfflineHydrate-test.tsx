/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
jest.useFakeTimers();

jest.mock('scheduler', () => require.requireActual('scheduler/unstable_mock'));

import * as React from 'react';
//import * as Scheduler from 'scheduler';
const Scheduler = require('scheduler');

//import { ReactRelayContext } from "react-relay";

import { useQuery, Store, RecordSource, useRestore } from '../src';
import { RelayEnvironmentProvider } from 'relay-hooks';

import * as ReactTestRenderer from 'react-test-renderer';

//import readContext from "react-relay/lib/readContext";

import { createOperationDescriptor } from 'relay-runtime';

import { simpleClone } from 'relay-test-utils-internal';
import { generateAndCompile } from './TestCompiler';
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

const QueryRendererHook = (props: any) => {
    const { render, query, variables, cacheConfig } = props;
    const queryData = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        //fetchKey
    });

    return <React.Fragment>{render(queryData)}</React.Fragment>;
};

const ReactRelayQueryRenderer = (props: any) => (
    <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
);

const NOT_REHYDRATED = 'NOT_REHYDRATED';

const QueryRendererUseRestore = (props: any): any => {
    const rehydrated = useRestore(props.environment);
    if (!rehydrated) {
        return NOT_REHYDRATED;
    }

    return (
        <RelayEnvironmentProvider environment={props.environment}>
            <QueryRendererHook {...props} />
        </RelayEnvironmentProvider>
    );
};

/*function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}*/

function expectToBeRendered(
    renderSpy,
    readyState: {
        data: any;
        error: Error | null;
    },
): void {
    // Ensure useEffect is called before other timers

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

    expect(renderSpy).toBeCalledTimes(1);

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(true);
    expect(actualResult.error).toEqual(null);
    expect(actualResult.data).toEqual(null);
}

function expectToBeNotLoading(renderSpy): void {
    // Ensure useEffect is called before other timers

    expect(renderSpy).toBeCalledTimes(1);

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(false);
    expect(actualResult.error).toEqual(null);
    expect(actualResult.data).toEqual(null);
}

function expectToBeError(renderSpy, error): void {
    // Ensure useEffect is called before other timers

    expect(renderSpy).toBeCalledTimes(1);

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(false);
    expect(actualResult.error).toEqual(error);
    expect(actualResult.data).toEqual(null);
}

function expectHydrate(environment, rehydrated, online): void {
    expect(environment.isOnline()).toEqual(online);
    expect(environment.isRehydrated()).toEqual(rehydrated);
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

    expect(renderSpy).toBeCalledTimes(1);
    const { isLoading = false } = readyState;

    const actualResult = renderSpy.mock.calls[0][0];
    expect(actualResult.isLoading).toEqual(isLoading);

    expect(actualResult.data).toEqual(readyState.data);
    expect(actualResult.error).toEqual(readyState.error);
    expect(actualResult.retry).toEqual(expect.any(Function));
}

describe('ReactRelayQueryRenderer', () => {
    let TestQuery;

    let cacheConfig;
    let environment;
    let render;
    let store;
    let data;
    let initialData;
    let owner;
    let ownerTTL;
    let onlineGetter;
    const variables = { id: '4' };
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
    const dataInitialState = (owner, isLoading = false, ttl = false) => {
        return {
            error: null,
            data: {
                node: {
                    id: '4',
                    name: 'Zuck',

                    __fragments: {
                        TestFragment: {},
                    },

                    __fragmentOwner: ttl ? ownerTTL.request : owner.request,
                    __id: '4',
                },
            },
            isLoading,
        };
    };

    const dataRestoredState = (owner, isLoading = false, ttl = false) => {
        return {
            error: null,
            data: {
                node: {
                    id: '4',
                    name: 'ZUCK',

                    __fragments: {
                        TestFragment: {},
                    },

                    __fragmentOwner: ttl ? ownerTTL.request : owner.request,
                    __id: '4',
                },
            },
            isLoading,
        };
    };

    const loadingStateRehydrated = {
        error: null,
        props: null,
        rehydrated: true,
        online: true,
        retry: expect.any(Function),
    };

    const loadingStateRehydratedOffline = {
        error: null,
        props: null,
        rehydrated: true,
        online: false,
        retry: expect.any(Function),
    };

    const loadingStateNotRehydrated = {
        error: null,
        props: null,
        rehydrated: false,
        online: false,
        retry: expect.any(Function),
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
            },
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

    describe('rehydrate the environment when online', () => {
        describe('no initial state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage() }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();
                expectHydrate(environment, true, true);
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expectHydrate(environment, false, false);

                render.mockClear();
                jest.runAllTimers();
                expectHydrate(environment, true, true);
            });
        });
        describe('initial state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, true);
                expectToBeRenderedFirst(render, dataInitialState(owner));
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expectHydrate(environment, false, false);
                expectToBeRenderedFirst(render, dataInitialState(owner));

                render.mockClear();
                jest.runAllTimers();
                const calls = render.mock.calls;
                expect(calls.length).toBe(0);
            });
        });

        describe('initial state is different from restored state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({
                        storage: createPersistedStorage(restoredState),
                        initialState: { ...data },
                    }),
                    { storage: createPersistedStorage() },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);
                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, true);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );

                expectHydrate(environment, false, false);
                expectToBeRenderedFirst(render, dataInitialState(owner));

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, true);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });
        });

        describe(' no initial state, with restored state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage(restoredState) }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, true);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expectHydrate(environment, false, false);
                expectToBeNotLoading(render);

                render.mockClear();
                jest.runAllTimers();
                expectHydrate(environment, true, true);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });
        });
    });

    describe('rehydrate the environment when offline', () => {
        describe('no initial state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage() }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });

                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectToBeNotLoading(render);
                expectHydrate(environment, true, false);
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );

                expectToBeNotLoading(render);
                expectHydrate(environment, false, false);

                render.mockClear();
                jest.runAllTimers();

                expectToBeNotLoading(render);
                expectHydrate(environment, true, false);
            });
        });
        describe('initial state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, false);
                expectToBeRenderedFirst(render, dataInitialState(owner));
                //expect(propsInitialState(owner, true, false)).toBeRendered();
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expectHydrate(environment, false, false);
                expectToBeRenderedFirst(render, dataInitialState(owner));

                render.mockClear();
                jest.runAllTimers();
                const calls = render.mock.calls;
                expect(calls.length).toBe(0);
            });
        });

        describe('initial state is different from restored state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage(restoredState), initialState: { ...data } }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, false);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });

            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );

                expectHydrate(environment, false, false);
                expectToBeRenderedFirst(render, dataInitialState(owner));

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, false);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });
        });

        describe(' no initial state, with restored state', () => {
            beforeEach(async () => {
                store = new Store(
                    new RecordSource({ storage: createPersistedStorage(restoredState) }),
                    {
                        storage: createPersistedStorage(),
                    },
                    { queryCacheExpirationTime: null },
                );
                environment = createMockEnvironment({ store });
            });

            it('with useRestore', () => {
                const instance = ReactTestRenderer.create(
                    <QueryRendererUseRestore
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(instance.toJSON()).toEqual(NOT_REHYDRATED);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, false);
                expectToBeRenderedFirst(render, dataRestoredState(owner));
            });

            /*
            if the application is offline, the policy is still store-only and since it has not been modified, 
            the execute is not re-executed and the application is still in a loading state. (We want to avoid it, we want recover restored state)
            */
            it('without useRestore', () => {
                ReactTestRenderer.create(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );

                expectHydrate(environment, false, false);
                expectToBeNotLoading(render);

                render.mockClear();
                jest.runAllTimers();

                expectHydrate(environment, true, false);
                expectToBeNotLoading(render);
            });
        });
    });
});
