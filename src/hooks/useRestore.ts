import { useState, useEffect } from "react";

function useRestore(environment) {
const [rehydratate, setRehydratate] = useState(environment.isRehydrated());

  useEffect(() => {
    if (!environment.isRestored()) {
      environment.restore().then(restored => 
        setRehydratate(environment.isRehydrated())
      )
    }
    const unsubscribe = environment.getStoreOffline().subscribe(() => {
      if (environment.isRehydrated()) {
        unsubscribe();
        setRehydratate(environment.isRehydrated())
        
      }
    });
    return () => unsubscribe();
  }, [environment.isRehydrated()]);

  return rehydratate;
}

export default useRestore;