import * as React from 'react';
import { useState, useEffect } from "react";
import QueryRenderer, { Props } from './QueryRendererHook';

export interface OfflineProps extends Props {
  LoadingComponent?: any,
};

const QueryRendererOffline = (props: OfflineProps) => {

  const [rehydratate, setRehydratate] = useState(props.environment.isRehydrated());

  useEffect(() => {
    const unsubscribe = props.environment.storeOffline.subscribe(() => {
      if (props.environment.isRehydrated()) {
        unsubscribe();
        setRehydratate(props.environment.isRehydrated())
        
      }
    });
    return () => unsubscribe();
  }, [props.environment.isRehydrated()]);

  return rehydratate? <QueryRenderer {...props} /> : props.LoadingComponent ? props.LoadingComponent : <div>Loading...</div>;

}

export default QueryRendererOffline;