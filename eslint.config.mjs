import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    // Generated output that is gitignored and therefore absent on a fresh CI
    // checkout, but present for anyone who has run a build or a Capacitor
    // sync. Without these ignores the very same lint command is green in CI
    // and reports tens of thousands of errors in compiled bundles locally,
    // which makes `nx affected -t lint` useless as a pre-push check.
    //
    // `functions/lib` is `tsc` output; the Firebase-CLI `.eslintrc.js` used to
    // carry it as `ignorePatterns` but that file was never actually applied.
    // The iOS and Android entries are the copied web bundle that
    // `capacitor sync` writes into the native wrappers.
    ignores: [
      '**/dist',
      'apps/bite-tribe-firebase/functions/lib',
      'apps/bite-tribe-ios/ios/App/App/public',
      'apps/bite-tribe-android/android/app/build',
      'apps/bite-tribe-android/android/app/src/main/assets/public',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // Build-time esbuild plugin shared by both app builds. It runs in
            // Node before bundling and never ends up in an app bundle.
            '^.*/tools/env-var-plugin$',
          ],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:shell', 'scope:common'],
            },
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:store',
                'scope:common',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:model',
                'type:store',
                'scope:common',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:store',
                'scope:common',
                'type:api',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:store',
              onlyDependOnLibsWithTags: [
                'scope:common',
                'type:api',
                'type:model',
              ],
            },
            {
              sourceTag: 'scope:common',
              onlyDependOnLibsWithTags: ['scope:common'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'scope:common',
                'type:model',
              ],
            },
            {
              sourceTag: 'scope:bite-tribe',
              onlyDependOnLibsWithTags: [
                'scope:bite-tribe',
                'scope:common',
                'type:ui',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      // Both apps bootstrap through `provideIonicAngular` from
      // `@ionic/angular/standalone`. In that build a custom element only exists
      // once something calls its `defineCustomElement`, which the standalone
      // controllers do in their constructor and the identically named lazy
      // exports below do not. `createOverlay` then awaits
      // `customElements.whenDefined(tag)` forever, so `await create()` hangs
      // with no error and no rejection - this silently blocked registration for
      // a whole release (issue #1219). `MenuController` is listed because the
      // two entry points wrap different `menuController` singletons, so the
      // lazy one addresses an empty menu registry. Everything else exported
      // from `@ionic/angular` (`NavController`, `Platform`,
      // `IonicRouteStrategy`, `AngularDelegate`, event-detail types) is
      // re-exported from `@ionic/angular/common` by both entry points and is
      // safe. Specs are deliberately not exempt: a mock provided against the
      // lazy token is never injected into code that resolves the standalone
      // one. See [[Current State - Known Issues]].
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@ionic/angular',
              importNames: [
                'ActionSheetController',
                'AlertController',
                'LoadingController',
                'MenuController',
                'ModalController',
                'PickerController',
                'PopoverController',
                'ToastController',
              ],
              message:
                "Import Ionic controllers from '@ionic/angular/standalone'. The '@ionic/angular' versions never define their custom element, so create() never resolves and the caller hangs forever (issue #1219).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
  {
    files: ['*.js', '*.jsx'],
    extends: ['plugin:@nx/javascript'],
    rules: {
      'no-extra-semi': 'off',
    },
  },
  {
    files: ['*.stories.*', 'main.js'],
    extends: ['plugin:storybook/recommended'],
  },
];
