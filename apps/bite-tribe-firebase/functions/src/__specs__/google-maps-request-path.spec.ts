import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Google Maps Platform App Check only accepts tokens from the client Maps and
 * Places SDKs. BiteTribe reaches Places API (New) exclusively server-to-server
 * from Cloud Functions with `X-Goog-Api-Key`, and a server request cannot carry
 * an App Check token — which is why the Console reports Places API (New) as 0%
 * verified while Firestore, Storage, and Authentication are verified
 * (issue #1245). The verified control for Places is therefore the callable in
 * front of it: App Check enforced plus an authenticated caller.
 *
 * That reasoning only holds while the request path stays where it is, so this
 * spec pins both halves of it:
 *
 * - no app or library talks to a Google Maps host, and no native Places SDK is
 *   linked, so the backend stays the single request path;
 * - every callable is registered with App Check enforcement, so the boundary
 *   standing in for Places App Check cannot be dropped by accident.
 *
 * A native Places SDK would support App Check directly and would change this
 * verdict; adopting one means revisiting [[issue-1245]] rather than deleting
 * the failing assertion.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const FUNCTIONS_SOURCE = join(
  'apps',
  'bite-tribe-firebase',
  'functions',
  'src',
);

const SCANNED_ROOTS = ['apps', 'libs'];
const SCANNED_EXTENSIONS = ['.ts', '.html', '.swift', '.kt', '.java'];
const SKIPPED_DIRECTORIES = new Set([
  '.angular',
  '.nx',
  'Pods',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'www',
]);

/**
 * Build output that mirrors sources already scanned. Matched by path because
 * `lib` is also the source folder of every Nx library.
 */
const SKIPPED_PATHS = [join('apps', 'bite-tribe-firebase', 'functions', 'lib')];

const GOOGLE_MAPS_HOSTS = /(?:maps|places|routes)\.googleapis\.com/;

/** Native SDK entry points that would carry App Check tokens themselves. */
const NATIVE_PLACES_SDKS: { file: string; pattern: RegExp }[] = [
  {
    file: join('apps', 'bite-tribe-ios', 'ios', 'App', 'Podfile'),
    pattern: /GooglePlaces|GoogleMaps/,
  },
  {
    file: join('apps', 'bite-tribe-android', 'android', 'app', 'build.gradle'),
    pattern: /libraries\.places|play-services-maps/,
  },
];

const isSkippedPath = (path: string): boolean =>
  SKIPPED_PATHS.some((skipped) =>
    relative(WORKSPACE_ROOT, path).startsWith(skipped),
  );

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry) || isSkippedPath(path)
        ? []
        : listSourceFiles(path);
    }

    return SCANNED_EXTENSIONS.some((extension) => entry.endsWith(extension))
      ? [path]
      : [];
  });

const isFunctionsSource = (file: string): boolean =>
  relative(WORKSPACE_ROOT, file).startsWith(`${FUNCTIONS_SOURCE}${sep}`);

const listFunctionsSourceFiles = (): string[] =>
  listSourceFiles(join(WORKSPACE_ROOT, FUNCTIONS_SOURCE)).filter(
    (file) => !file.includes(`${sep}__specs__${sep}`),
  );

/**
 * Reads the options object a callable is registered with. `onCall` takes the
 * options as its first argument, so the literal ends at the argument that
 * follows it.
 */
const findRawCallableOptions = (source: string): string[] => {
  const flattened = source.replace(/\s+/g, ' ');
  const pattern = /\bonCall(?:<[^(]*>)?\( *\{([^}]*)\}/g;

  return [...flattened.matchAll(pattern)].map((match) => match[1]);
};

const enforcesAppCheck = (options: string): boolean =>
  /enforceAppCheck: true/.test(options) ||
  /\.\.\.getAppCheckCallableOptions\(\)/.test(options);

describe('Google Maps Platform request path', () => {
  const sourceFiles = SCANNED_ROOTS.flatMap((root) =>
    listSourceFiles(join(WORKSPACE_ROOT, root)),
  );

  it('finds the workspace sources to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('reaches Google Maps hosts only from the functions backend', () => {
    const callers = sourceFiles
      .filter((file) => GOOGLE_MAPS_HOSTS.test(readFileSync(file, 'utf8')))
      .filter((file) => !isFunctionsSource(file))
      .map((file) => relative(WORKSPACE_ROOT, file));

    expect(callers).toEqual([]);
  });

  it('still routes Places requests through the functions backend', () => {
    const backendCallers = listFunctionsSourceFiles().filter((file) =>
      /places\.googleapis\.com/.test(readFileSync(file, 'utf8')),
    );

    expect(backendCallers.length).toBeGreaterThan(0);
  });

  it('links no native Maps or Places SDK on iOS or Android', () => {
    const linked = NATIVE_PLACES_SDKS.filter(({ file, pattern }) =>
      pattern.test(readFileSync(join(WORKSPACE_ROOT, file), 'utf8')),
    ).map(({ file }) => file);

    expect(linked).toEqual([]);
  });

  it('enforces App Check on every callable, including the Places callables', () => {
    const unenforced = listFunctionsSourceFiles()
      .filter((file) => !file.endsWith(`${sep}callable-options.ts`))
      .filter((file) =>
        findRawCallableOptions(readFileSync(file, 'utf8')).some(
          (options) => !enforcesAppCheck(options),
        ),
      )
      .map((file) => relative(WORKSPACE_ROOT, file));

    expect(unenforced).toEqual([]);
  });
});
