/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
jest.useFakeTimers();

jest.mock('scheduler', () => require.requireActual('scheduler/unstable_mock'));

import * as React from 'react';
const Scheduler = require('scheduler');
import { useQuery, Store, RecordSource, useRestore } from '../src';
import { RelayEnvironmentProvider } from 'relay-hooks';
import * as ReactTestRenderer from 'react-test-renderer';
import { createOperationDescriptor } from 'relay-runtime';

import { simpleClone } from 'relay-test-utils-internal';

import { generateAndCompile } from './TestCompiler';
import { createMockEnvironment } from './RelayModernEnvironmentMock';
import { createPersistedStorage } from './Utils';

const QueryRendererHook = (props: any) => {
    const { render, query, variables, cacheConfig, ttl } = props;
    let networkCacheConfig = cacheConfig;
    if (ttl) {
        if (!networkCacheConfig) {
            networkCacheConfig = { ttl };
        } else {
            networkCacheConfig.ttl = ttl;
        }
    }
    const queryData = useQuery(query, variables, {
        networkCacheConfig,
    });

    return <React.Fragment>{render(queryData)}</React.Fragment>;
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

function unmount(unmount, ttl) {
    const realDate = Date.now;
    const date = Date.now();
    Date.now = jest.fn(() => date + ttl);
    unmount();
    Date.now = realDate;
    jest.runAllTimers();
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
    const variables = { id: '4' };
    const dataInitialState = (owner, isLoading, ttl = false) => {
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
    ownerTTL = createOperationDescriptor(TestQuery, variables, { ttl: 500 } as any);

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

    describe('Time To Live', () => {
        it('without TTL', async () => {
            store = new Store(
                new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
                {
                    storage: createPersistedStorage(),
                },
                { queryCacheExpirationTime: null },
            );
            environment = createMockEnvironment({ store });
            await environment.hydrate();
            const instanceA = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            const dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            unmount(instanceA.unmount, 1);
            expect(dispose).toBeCalled();

            render.mockClear();
            environment.mockClear();
            ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );
            expectToBeLoading(render);
        });

        it('with defaultTTL', async () => {
            store = new Store(
                new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
                {
                    storage: createPersistedStorage(),
                },
                { queryCacheExpirationTime: 100 },
            );
            environment = createMockEnvironment({ store });
            await environment.hydrate();
            const instanceA = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            let dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            unmount(instanceA.unmount, 1);
            expect(dispose).toBeCalled();

            render.mockClear();
            environment.mockClear();
            const instanceB = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );
            expectToBeRenderedFirst(render, dataInitialState(owner, false));

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            unmount(instanceB.unmount, 200);
            expect(dispose).toBeCalled();
            //runAllTimersDelay(200);

            render.mockClear();
            environment.mockClear();
            ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );
            expectToBeLoading(render);
        });

        it('with custom TTL', async () => {
            store = new Store(
                new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
                {
                    storage: createPersistedStorage(),
                },
                { queryCacheExpirationTime: 100 },
            );
            environment = createMockEnvironment({ store });
            await environment.hydrate();
            const instanceA = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                    ttl={500}
                />,
            );

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            let dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            instanceA.unmount();
            unmount(instanceA.unmount, 1);
            expect(dispose).toBeCalled();

            render.mockClear();
            environment.mockClear();
            const instanceB = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                    ttl={500}
                />,
            );

            expectToBeRenderedFirst(render, dataInitialState(owner, false, true));

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            unmount(instanceB.unmount, 200);
            expect(dispose).toBeCalled();
            //runAllTimersDelay(200);

            render.mockClear();
            environment.mockClear();
            const instanceC = ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                    ttl={500}
                />,
            );

            expectToBeRenderedFirst(render, dataInitialState(owner, false, true));

            render.mockClear();
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            unmount(instanceC.unmount, 500);
            expect(dispose).toBeCalled();
            //runAllTimersDelay(500);

            render.mockClear();
            environment.mockClear();
            ReactTestRenderer.create(
                <QueryRendererUseRestore
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                    ttl={500}
                />,
            );
            expectToBeLoading(render);
        });
    });
});
