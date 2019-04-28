import * as React from 'react';
import QueryRenderer, { Props } from './QueryRenderer';

export interface OfflineProps extends Props {
  LoadingComponent?: any,
};

interface State {
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
        if (this.props.environment.storeOffline.getState().rehydrated) {
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


export default QueryRendererOffline;