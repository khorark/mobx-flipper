import {addPlugin} from 'react-native-flipper';
import {toJS} from 'mobx';

import {applyPatch, IMiddlewareEvent, getPath} from 'mobx-state-tree';

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

const exlude_actions = ['@APPLY_SNAPSHOT'];

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

export const createMobxDebugger = (store: any) => {
  initPlugin(store);
  let payload: any | undefined;

  return (event: Event) => {
    if (currentConnection) {
      switch (event.type) {
        case 'action':
          const before = toJS(store);
          const startTime = new Date();

          payload = generatePayload({
            id: Date.parse(startTime.toString()),
            args:
              event?.arguments?.length && event.arguments[0].nativeEvent
                ? undefined
                : event.arguments,
            name: event.name,
            tree: {},
            before,
            startTime,
          });
          break;
        case 'reaction':
          if (!payload) return;

          payload.after = toJS(store);
          payload.took = `${
            Date.now() - Date.parse(payload.startTime.toString())
          } ms`;

          currentConnection.send('action', payload);

          payload = undefined;
          break;
      }
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
    if (currentConnection && !exlude_actions.includes(call.name)) {
      const startTime = new Date();

      const before = toJS(call.tree);
      next(call);

      const payload = generatePayload({
        ...call,
        name: `${getPath(call.context)}/${call.name}`,
        startTime,
        before,
      });
      currentConnection.send(call.type, payload);
    } else {
      next(call);
    }
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
    startTime,
    time: `${startTime.getUTCHours()}:${startTime.getUTCMinutes()}:${startTime.getUTCSeconds()}-${startTime.getUTCMilliseconds()}`,
    took: `${now - Date.parse(startTime.toString())} ms`,
    action: {type: name, payload: args ? args[0] : undefined},
    before,
    after: toJS(tree),
  };
};
