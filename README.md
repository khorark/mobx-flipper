# Mobx Flipper

![screenshot of the plugin](http://i.imgur.com/EHdtxfE.png)

`flipper-plugin-mobx-debugger` allows you read React Native mobx logs inside [Flipper](https://fbflipper.com/) now:

- Action
- State comparison

## Get Started

1. Install [mobx-flipper](https://github.com/khorark/mobx-flipper) middleware and `react-native-flipper` in your React Native app:

```bash
yarn add mobx-flipper react-native-flipper
# for iOS
cd ios && pod install
```

2. Add the middleware:

- MobX

```javascript
import {spy} from 'mobx';
import {createMobxDebugger} from 'flipper-mobx';

const store = new Store(); // your store

if (__DEV__) {
  spy(createMobxDebugger(store));
}
```

- MobX-state-tree

```javascript
import {addMiddleware} from 'mobx-state-tree';
import {createMstDebugger} from 'flipper-mobx';

const store = new Store(); // your store

if (__DEV__) {
  addMiddleware(store, createMstDebugger(store));
}
```

3. Install [flipper-plugin-mobx-debugger](https://github.com/khorark/flipper-plugin-mobx-debugger) in Flipper desktop client:

```
Manage Plugins > Install Plugins > search "mobx-debugger" > Install
```

4. Start your app, then you should be able to see Mobx Debugger on your Flipper app

## Acknowledgement

This plugin is inspired by [flipper-plugin-redux-debugger](https://github.com/jk-gan/flipper-plugin-redux-debugger).
