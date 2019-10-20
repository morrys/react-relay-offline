import * as React from "react";
import { useQuery, useRelayEnvironment } from "relay-hooks";
import { UseQueryProps } from "./RelayOfflineTypes";
import { STORE_ONLY, RenderProps } from "relay-hooks/lib/RelayHooksType";

export interface Props<T> extends UseQueryProps<T> {
  render: (renderProps: RenderProps<T>) => React.ReactNode;
}

const QueryRendererHook = <T extends {}>(props: Props<T>) => {
  const environment = useRelayEnvironment();
  const { render, fetchPolicy, query, variables, cacheConfig } = props;
  const hooksProps = useQuery(query, variables, {
    networkCacheConfig: cacheConfig,
    fetchPolicy: environment.isOnline() ? fetchPolicy : STORE_ONLY
  });

  return <React.Fragment>{render(hooksProps)}</React.Fragment>;
};

export default QueryRendererHook;
