# app-settings

Typed bridge to the `AppSettings` Capacitor plugin in the Android wrapper, which
opens the OS pages that own this app's permissions.

Android only. iOS reaches its app settings through the `app-settings:` URL
scheme and the web build has no OS page at all, so callers branch on the
platform before calling in.
