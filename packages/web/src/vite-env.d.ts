/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" enables web checkout; anything else (or unset) routes purchases to Google Play. */
  readonly VITE_WEB_CHECKOUT_ENABLED?: string;
}
