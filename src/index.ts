import {addPlugin} from 'react-native-flipper';
import cloneDeep from 'lodash.clonedeep';
import {toJS} from 'mobx';

import {applyPatch, IMiddlewareEvent} from 'mobx-state-tree';

let currentConnection: any = null;

type Payload = {
  id: number;
  name: string;
  args?: any[];
  tree: any;
  before: any;
  startTime: Date;
};

type Event = {
  type: string;
  name: string;
  arguments: any[];
};

type PatchData = {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value: any;
};

const errors = {
  NO_STORE: 'NO_STORE',
  MST_NOT_FOUND: 'MST_NOT_FOUND',
};

const initPlugin = (initStore: any, isMst = false) => {
  if (currentConnection == null) {
    addPlugin({
      getId() {
        return 'mobx-debugger';
      },
      onConnect(connection) {
        currentConnection = connection;

        const startTime = new Date();
        const payload = generatePayload({
          id: 0,
          name: 'INIT',
          tree: initStore,
          startTime,
          before: {},
        });
        currentConnection.send('init', payload);

        isMst && recieveMessage(initStore);
      },
      onDisconnect() {},
      runInBackground() {
        return true;
      },
    });
  }
};

const recieveMessage = (store: any) => {
  currentConnection.receive('applyPatch', (data: PatchData, responder: any) => {
    console.log('flipper mobx patch data', data);

    if (applyPatch) {
      if (store) {
        applyPatch(store, data);

        responder.success({
          ack: true,
        });
      } else {
        responder.success({
          error: errors.NO_STORE,
          message: 'store is not setup in flipper plugin',
        });
      }
    } else {
      responder.success({
        error: errors.MST_NOT_FOUND,
        message: 'Mobx state tree function applyPatch not found',
      });
    }
  });
};

const setAsyncTimeout = () =>
  new Promise((resolve) => setTimeout(() => resolve(), 1000));

export const createMobxDebugger = (store: any) => {
  initPlugin(store);

  return async (event: Event) => {
    if (event.type === 'action') {
      // TODO lodash.cloneDeep - error maximum call stack size
      const before = JSON.parse(JSON.stringify(toJS(store)));

      // TODO How get state after mutate?
      await setAsyncTimeout();

      const startTime = new Date();
      const payload = generatePayload({
        id: Date.parse(startTime.toUTCString()),
        args: event.arguments,
        name: event.name,
        tree: toJS(store),
        before,
        startTime,
      });

      currentConnection.send(event.type, payload);
    }
  };
};

export const createMstDebugger = (initStore: any) => {
  initPlugin(initStore, true);

  return (
    call: IMiddlewareEvent,
    next: (
      actionCall: IMiddlewareEvent,
      callback?: (value: any) => any,
    ) => void,
  ) => {
    const before = cloneDeep(toJS(call.tree));
    const startTime = new Date();

    next(call);

    const payload = generatePayload({...call, startTime, before});
    currentConnection.send(call.type, payload);
  };
};

const generatePayload = ({
  id,
  name,
  args,
  tree,
  before,
  startTime,
}: Payload) => {
  const now = Date.now();

  return {
    id,
    time: `${startTime.getUTCHours()}:${startTime.getUTCMinutes()}:${startTime.getUTCSeconds()}-${startTime.getUTCMilliseconds()}`,
    took: `${now - Date.parse(startTime.toString())} ms`,
    action: {type: name, payload: args ? args[0] : undefined},
    before,
    after: toJS(tree),
  };
};
