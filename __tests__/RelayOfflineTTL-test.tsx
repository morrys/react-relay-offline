jest.useFakeTimers();

jest.mock('scheduler', () => require.requireActual('scheduler/unstable_mock'));

import * as React from 'react';
const Scheduler = require('scheduler');
import { useQuery, RelayEnvironmentProvider, Store, RecordSource, useRestore } from '../src';
import * as ReactTestRenderer from 'react-test-renderer';
import { createOperationDescriptor } from 'relay-runtime';

import { generateAndCompile, simpleClone } from 'relay-test-utils-internal';
import { createMockEnvironment } from './RelayModernEnvironmentMock';
import { createPersistedStorage } from './Utils';

const QueryRendererHook = (props) => {
    const { render, query, variables, cacheConfig, ttl } = props;
    const { cached, ...relays } = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        ttl,
    });

    return <React.Fragment>{render(relays)}</React.Fragment>;
};

const NOT_REHYDRATED = 'NOT_REHYDRATED';

const QueryRendererUseRestore = (props): any => {
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
    const variables = { id: '4' };
    const propsInitialState = (owner, rehydrated, online = rehydrated) => {
        return {
            error: null,
            props: {
                node: {
                    id: '4',
                    name: 'Zuck',

                    __fragments: {
                        TestFragment: {},
                    },

                    __fragmentOwner: owner.request,
                    __id: '4',
                },
            },
            rehydrated,
            online,
            retry: expect.any(Function),
        };
    };

    const loadingStateRehydrated = {
        error: null,
        props: null,
        rehydrated: true,
        online: true,
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
            store = new Store(new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }), {
                storage: createPersistedStorage(),
                defaultTTL: -1,
            });
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
            expect(loadingStateRehydrated).toBeRendered();
        });

        it('with defaultTTL', async () => {
            store = new Store(new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }), {
                storage: createPersistedStorage(),
                defaultTTL: 100,
            });
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
            expect(propsInitialState(owner, true)).toBeRendered();

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
            expect(loadingStateRehydrated).toBeRendered();
        });

        it('with custom TTL', async () => {
            store = new Store(new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }), {
                storage: createPersistedStorage(),
                defaultTTL: 100,
            });
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
            expect(propsInitialState(owner, true)).toBeRendered();

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
            expect(propsInitialState(owner, true)).toBeRendered();

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
            expect(loadingStateRehydrated).toBeRendered();
        });
    });
});
