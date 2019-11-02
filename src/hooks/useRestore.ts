import { useState } from "react";

function useRestore(environment) {
  const [rehydratate, setRehydratate] = useState(environment.isRehydrated());

  if (!rehydratate) {
    environment
      .hydrate()
      .then(() => setRehydratate(environment.isRehydrated()));
  }
  return rehydratate;
}

export default useRestore;
