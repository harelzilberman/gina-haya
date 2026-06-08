import './src/cryptoPolyfill';

// FormData polyfill for Hermes
if (typeof (global as any).FormData === 'undefined') {
  (global as any).FormData = class FormData {
    private _data: [string, any][] = [];
    append(key: string, value: any) { this._data.push([key, value]); }
    get(key: string) { return this._data.find(([k]) => k === key)?.[1]; }
  };
}

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
