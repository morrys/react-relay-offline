import * as React from 'react';
import QueryRenderer, { Props } from './QueryRendererHook';
import useRestore from './hooks/useRestore';
import Loading from "./Loading";

export interface OfflineProps extends Props {
  LoadingComponent?: any,
};

const QueryRendererOffline = (props: OfflineProps) => {
  const { LoadingComponent = Loading } = props;
  const rehydratate = useRestore(props.environment);

  return rehydratate ? <QueryRenderer {...props} /> : LoadingComponent;

}

export default QueryRendererOffline;