import * as React from "react";
import QueryRenderer, { Props } from "./QueryRendererHook";
import useRestore from "./hooks/useRestore";
import Loading from "./Loading";
import { RelayEnvironmentProvider } from "relay-hooks";

export interface OfflineProps<T> extends Props<T> {
  LoadingComponent?: any;
  environment: any;
}

const QueryRendererOffline = function<T>(props: OfflineProps<T>) {
  const { LoadingComponent = Loading, environment } = props;
  const rehydratate = useRestore(environment);

  return rehydratate ? (
    <RelayEnvironmentProvider environment={environment}>
      <QueryRenderer {...props} />
    </RelayEnvironmentProvider>
  ) : (
    LoadingComponent
  );
};

export default QueryRendererOffline;
