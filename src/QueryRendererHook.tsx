import * as React from 'react';
import { ReactRelayContext } from 'react-relay';
import useQuery from './hooks/useQuery';
import { UseQueryProps } from './RelayOfflineTypes';


export type RenderProps = {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export interface Props extends UseQueryProps {
    render: (renderProps: RenderProps) => React.ReactNode,
};

export default function (props: Props)  {
    const {render, ...others} = props;
    const hooksProps = useQuery(others);

    return <ReactRelayContext.Provider value={hooksProps.relay}>
        {render(hooksProps.renderProps)}
    </ReactRelayContext.Provider>

}



//export default QueryRendererHook;