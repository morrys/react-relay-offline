import * as React from 'react';
import { useState, useEffect } from "react";
import QueryRenderer, { Props } from './QueryRendererHook';

export interface OfflineProps extends Props {
  LoadingComponent?: any,
};

/*interface State {
  rehydratate: boolean,
};

class QueryRendererOffline extends React.Component<OfflineProps, State> {
  
  state: State;

  constructor(props) {
    super(props);
    this.state = {
      rehydratate: props.environment.isRehydrated()
    }
    if (!this.state.rehydratate) {

      const unsubscribe = this.props.environment.storeOffline.subscribe(() => {
        if (this.props.environment.isRehydrated()) {
          this.setState({
            rehydratate: this.props.environment.isRehydrated()
          })
          unsubscribe();
        }
      });
    }

  }


  render() {
    const { rehydratate } = this.state;
    const { LoadingComponent } = this.props;

    if (!rehydratate) {
      return LoadingComponent ? LoadingComponent : <div>Loading...</div>;
    }
    return <QueryRenderer {...this.props} />
  }
  
}


export default QueryRendererOffline;*/

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