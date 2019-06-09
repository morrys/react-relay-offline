/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as ExecutionEnvironment from 'fbjs/lib/ExecutionEnvironment';
import * as findIndex from 'array-find-index';
import * as invariant from 'fbjs/lib/invariant';

const connection =
  ExecutionEnvironment.canUseDOM &&
  ((window.navigator as any).connection ||
  (window.navigator as any).mozConnection ||
  (window.navigator as any).webkitConnection);

// Prevent the underlying event handlers from leaking and include additional
// properties available in browsers
const getConnectionInfoObject = () => {
  const result = {
    effectiveType: 'unknown',
    type: 'unknown',
    isConnected: window.navigator.onLine
  };
  if (!connection) {
    return result;
  }
  for (const prop in connection) {
    const value = connection[prop];
    if (typeof value !== 'function' && value != null) {
      result[prop] = value;
    }
  }
  return result;
};

const netInfoListeners = [];
const connectionListeners = [];

/**
 * Navigator online: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine
 * Network Connection API: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
const NetInfo = {
  addEventListener(handler: Function): { remove: () => void } {
    if (!connection) {
      console.error(
        'Network Connection API is not supported. Not listening for connection type changes.'
      );
      return {
        remove: () => {}
      };
    }

    const wrappedHandler = () => handler(getConnectionInfoObject());
    netInfoListeners.push([handler, wrappedHandler]);
    connection.addEventListener('change', wrappedHandler);
    return {
      remove: () => NetInfo.removeEventListener(handler)
    };
  },

  removeEventListener(handler: Function): void {

    const listenerIndex = findIndex(netInfoListeners, pair => pair[0] === handler);
    invariant(listenerIndex !== -1, 'Trying to remove NetInfo listener for unregistered handler');
    const [, wrappedHandler] = netInfoListeners[listenerIndex];
    connection.removeEventListener('change', wrappedHandler);
    netInfoListeners.splice(listenerIndex, 1);
  },

  fetch(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        resolve(getConnectionInfoObject());
      } catch (err) {
        resolve('unknown');
      }
    });
  },
  isConnected: {
    addEventListener(type: string, handler: Function): { remove: () => void } {

      const onlineCallback = () => handler(true);
      const offlineCallback = () => handler(false);
      connectionListeners.push([handler, onlineCallback, offlineCallback]);

      window.addEventListener('online', onlineCallback, false);
      window.addEventListener('offline', offlineCallback, false);

      return {
        remove: () => NetInfo.isConnected.removeEventListener('connectionChange', handler)
      };
    },

    removeEventListener(type: string, handler: Function): void {
      const listenerIndex = findIndex(connectionListeners, pair => pair[0] === handler);
      invariant(
        listenerIndex !== -1,
        'Trying to remove NetInfo connection listener for unregistered handler'
      );
      const [, onlineCallback, offlineCallback] = connectionListeners[listenerIndex];

      window.removeEventListener('online', onlineCallback, false);
      window.removeEventListener('offline', offlineCallback, false);

      connectionListeners.splice(listenerIndex, 1);
    },

    fetch(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        try {
          resolve(window.navigator.onLine);
        } catch (err) {
          resolve(true);
        }
      });
    }
  }
};


export default NetInfo;