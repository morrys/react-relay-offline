import * as React from "react";
import { QueryRendererProps } from "./RelayOfflineTypes";
import useQueryOffline from "./hooks/useQueryOffline";

const QueryRendererHook = <T extends {}>(props: QueryRendererProps<T>) => {
  const { render, fetchPolicy, query, variables, cacheConfig, ttl } = props;
  const hooksProps = useQueryOffline(query, variables, {
    networkCacheConfig: cacheConfig,
    fetchPolicy,
    ttl
  });

  return <React.Fragment>{render(hooksProps)}</React.Fragment>;
};

export default QueryRendererHook;
