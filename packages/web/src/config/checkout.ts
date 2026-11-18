/**
 * Web checkout switch. Build-time flag: set VITE_WEB_CHECKOUT_ENABLED=true
 * to turn the web payment provider back on. Default (unset) is OFF — every
 * purchase entry point then sends the visitor to the Android app on Google Play.
 */
export const WEB_CHECKOUT_ENABLED = import.meta.env.VITE_WEB_CHECKOUT_ENABLED === 'true';
