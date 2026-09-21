import { Capacitor } from '@capacitor/core';

/**
 * Hosts that mean "this machine" and therefore mean something different inside
 * a native app than they do in the browser tab the environment file was
 * written for.
 */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * The Android emulator's alias for the loopback interface of the machine
 * hosting it. A physical Android device has no such alias.
 */
const ANDROID_EMULATOR_HOST_ALIAS = '10.0.2.2';

const isLoopback = (host: string): boolean =>
  LOOPBACK_HOSTS.includes(host.toLowerCase());

/**
 * The address the WebView was served from, when that is a real network
 * address rather than a loopback or a Capacitor scheme.
 *
 * Under live reload (`cap run ios|android -l --host 0.0.0.0`) Capacitor points
 * the WebView at the dev server on the developer machine's LAN address, so
 * `location.hostname` *is* the machine running the emulators - on a physical
 * device and on a simulator alike. A packaged build is served from
 * `capacitor://localhost` and has nothing to contribute here.
 */
const getServingHost = (): string | undefined => {
  const hostname = globalThis.location?.hostname;

  return hostname && !isLoopback(hostname) ? hostname : undefined;
};

/**
 * Resolves the emulator host an environment file configured as `localhost`
 * into an address the current runtime can actually reach.
 *
 * `localhost` is correct in a browser tab and wrong in every native wrapper:
 * inside an app it resolves to the phone or the emulated device, not to the
 * machine running `firebase emulators:start`. Resolution order:
 *
 * 1. A non-loopback configured host is already explicit - it is returned as is.
 * 2. The live-reload serving host, which is the developer machine's LAN
 *    address whenever the WebView was loaded over the network.
 * 3. `10.0.2.2` on Android, the emulator's alias for the host machine.
 * 4. The configured host unchanged, which is right on the web and on the iOS
 *    Simulator - both share the host machine's network stack.
 *
 * A packaged native build on a **physical** device reaches step 4 and keeps
 * `localhost`, which it cannot reach. That fails loudly at the first Firebase
 * call rather than silently redirecting to production, which is the point:
 * see issue #1221. Use the live-reload dev target to work against emulators
 * from a physical device.
 */
export const resolveEmulatorHost = (host: string): string => {
  if (!isLoopback(host)) {
    return host;
  }

  const servingHost = getServingHost();

  if (servingHost) {
    return servingHost;
  }

  return Capacitor.getPlatform() === 'android'
    ? ANDROID_EMULATOR_HOST_ALIAS
    : host;
};

/**
 * Splits an emulator URL such as `http://localhost:9099` into the parts the
 * Capacitor plugins take, with the host resolved for the current runtime.
 *
 * The Auth emulator is configured as a URL because the Firebase JS SDK's
 * `connectAuthEmulator` takes one, while `FirebaseAuthentication.useEmulator`
 * takes host, port and scheme separately. Both are fed from this one parse so
 * the JS SDK and the native plugin can never disagree about where Auth is.
 */
export const parseEmulatorUrl = (
  url: string,
): { host: string; port?: number; scheme: string; url: string } => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    // An unparseable value is handed back untouched, so a misconfigured
    // environment fails at the Firebase call that uses it rather than here,
    // where the message would say nothing about Auth.
    return { host: url, port: undefined, scheme: 'http', url };
  }

  const scheme = parsed.protocol.replace(/:$/, '');
  const host = resolveEmulatorHost(parsed.hostname);
  const port = parsed.port ? Number(parsed.port) : undefined;

  return {
    host,
    port,
    scheme,
    url: `${scheme}://${host}${port ? `:${port}` : ''}`,
  };
};
