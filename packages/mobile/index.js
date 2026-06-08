import './src/cryptoPolyfill';

// FormData polyfill for Hermes
if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = {};
    }
    append(key, value) { this.data[key] = value; }
    get(key) { return this.data[key]; }
  };
}

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
