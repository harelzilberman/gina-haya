import './src/cryptoPolyfill';

// FormData polyfill for Hermes
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() { this._data = []; }
    append(key, value) { this._data.push([key, value]); }
    get(key) { return this._data.find(([k]) => k === key)?.[1]; }
  };
}

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
