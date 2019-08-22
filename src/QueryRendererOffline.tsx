import * as React from 'react';
import QueryRenderer, { Props } from './QueryRendererHook';
import useRestore from './hooks/useRestore';

export interface OfflineProps extends Props {
  LoadingComponent?: any,
};

const QueryRendererOffline = (props: OfflineProps) => {

  const rehydratate = useRestore(props.environment)

  return rehydratate? <QueryRenderer {...props} /> : props.LoadingComponent ? props.LoadingComponent : <div>Loading...</div>;

}

export default QueryRendererOffline;