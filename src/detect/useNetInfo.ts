import { useState, useEffect } from 'react';
import NetInfo from "./NetInfo";

export function useNetInfo(): any {
    const [netInfo, setNetInfo] = useState<any>({
      type: 'unknown',
      isConnected: false,
      details: null,
    });
  
    useEffect((): (() => void) => {
      const dispose = NetInfo.addEventListener(setNetInfo);
      return () => dispose.remove();
    }, []);
  
    return netInfo;
  }

export default useNetInfo;