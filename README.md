[![Travellers Apps CI](https://github.com/muhammedgaygisiz/travellers-apps/actions/workflows/pipeline.yml/badge.svg)](https://github.com/muhammedgaygisiz/travellers-apps/actions/workflows/pipeline.yml)
[![codecov](https://codecov.io/github/muhammedgaygisiz/travellers-apps/branch/develop/graph/badge.svg?token=QGA8MS6VXF)](https://codecov.io/github/muhammedgaygisiz/travellers-apps)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# Bite Tribe

# Prerequisites

- [Node.js](https://nodejs.org/en/download/) (LTS version)
- [NPM](https://www.npmjs.com/get-npm) (comes with Node.js)

- Install dependencies:

```
npm install
```

- Get the .env file from one of the developers and copy it to the root of the app `apps/bite-tribe/.env`

# Run the application locally:

If you start the application like described below, it will connect to the real firebase.

It is recommended to use the firebase emulators for local development (see below). For that,
set the environment variable `NX_APP_BITE_TRIBE_IS_DEV` to `true` in the `.env` file.

## Start the frontend application

```
nx serve bite-tribe
```

- The application will be available at [http://localhost:4200](http://localhost:4200)

## Start firebase emulators for local development

```
nx firebase-serve bite-tribe-firebase
```

## Start firebase emulators and frontend for local development

```
npm run development
```

You can then access http://localhost:4200/start. Sometimes you can have problems with the firebase
that still runs in the background. Currently it starts at port `8085`. You can use the commands:

```
sudo lsof -i tcp:8085
sudo kill -9 <procesIdFromStepAbove>
```

# Howto setup a new page

- Create a page library with `<page-name>` the name of the page you want to create:

```
nx g @nx/angular:lib libs/bite-tribe/<page-name>/page --name=bite-tribe/<page-name> --tags=scope:bite-tribe,type:feature

nx g @nx/angular:lib libs/bite-tribe/<page-name>/data-access --name=bite-tribe/<page-name>-data-access --tags=scope:bite-tribe,type:data-access

```

- Delete the content of the folder `src/lib` under the generated libraries

- Under the page's `lib` folder create the folders `integration` and `components`

- In the `integration` folder
  - create a typescript module with the name: `<page-name>.container.ts`.
  - In the index.ts file of the page library export the container component
  - It will be an angular component with the template inlined and no styling
  - Create another typescript module with the name `<page-name>.service.ts`
  - In the `routes.ts` file of the bite-tribe app, add the route for the new page with the new page's container component

- In `jest.config.js` of the page library, add the following:

```ts
const NODE_MODULES_TO_IGNORE = [
  '.*.mjs$',
  'ionicons',
  '@ionic',
  '@stencil',
  '@capacitor',
].join('|');

...
transform: {
  '^.+\\.(ts|mjs|js|html)$': [
    'jest-preset-angular',
    {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.(html|svg)$',
      isolatedModules: true,  // <-- add this line
    },
  transformIgnorePatterns: [`node_modules/(?!(${NODE_MODULES_TO_IGNORE}))`], //  <-- modify this line
...

```

- Under the page's data-access library, create a typescript module with the name: `<page-name>-data-access.service.ts`

# TravellersApps

- [Demo](https://bite-tribe.web.app/)
- [Storybook](https://storybook-e0333.firebaseapp.com/) (currently not available)
- [Github-Project](https://github.com/muhammedgaygisiz/travellers-apps)

# Table of Content

1. [NX](docs/NX.md)
2. [Weekly Reads](docs/weekly_reads.md)

# Quick References

Report useful version numbers (to copy into the Nx issue template)

`nx report`

# Update dependencies

First create a new branch wherein the update can be done without risking
any breaks or incompatibilities. The pipeline should be able to check this
for the different apps in the workspace.

To update the nrwl cli you have to run following command with `<version>`
specifying to which version of nx to migrate.

```

npm run nx -- migrate <version>

```

The list of versions can be found [here](https://github.com/nrwl/nx/releases)
(Release notes).

After running the command the dependencies in `package.json` will be updated.
nx will also update Angular, Typescript, Ngrx, Jest, Cypress and Storybook.

It is also possible that nx creates a `migrations.json` file, which should not be
checked in or at least should be deleted before the branch is merged into develop.

Next run `npm i` to install the new dependencies and run the migrations with
the following command.

```

npm run nx -- migrate --run-migrations

```

Not all dependencies are managed by nx (e.g. ngx-mat-select-search). They can be
updated by nx, though. `nx migrate` can be seen as a synonym to `ng update`. To update
a dependency the command

```

npm run nx -- migrate my-dependency@x.y.z

```

can be utilized. Please be aware that after the command `npm install` has to be
executed and a quick check of the app and specifically of the components which could
be affected is recommended.

At the end of the process `npm dedupe` can be executed to tidy up the dependency graph.

# Show npm dependency tree

Dependencies

```

npm list

```

With transitive dependencies

```

npm list --all

```

```

```

# Native app insights

## iOS

To create and upload a new version of the iOS app to TestFlight, following
steps are required:

- Build the web app via

```
nx build bite-tribe
```

- Open the iOS project in Xcode

```
nx run bite-tribe-ios:open
```

- Increase the build number in Xcode
- Sync the build result to the iOS project

```
nx run bite-tribe-ios:sync
```

- In Xcode select `Any iOS Device (arm64)` as target device
- In Xcode select `Product` -> `Archive`
- After the archive is created, the `Organizer` window opens
- Select the created archive and click on `Distribute App`
- Confirm all steps of the distribution wizard
- After the upload is completed, the app should be available in App Store Connect
- Answer the Compliance questions in App Store Connect
- Add the external testers to the release

## Android

To create and upload a new version of the Android app to the Play Store, following
steps are required:

- Build the web app via

```
nx build bite-tribe
```

- Open the Android project in Android Studio

```
nx run bite-tribe-android:open
```

- Increase the `versionCode` in the root `build.gradle` file
- Sync the build result to the Android project

```
nx run bite-tribe-android:sync
```

- In Android Studio select `Build` -> `Generate Signed Bundle / APK`
- Select `Android App Bundle` and click `Next`
- Select the existing key store and provide the credentials
- Select the `release` build type and finish the wizard
- After the build is completed, the `Locate` button appears
- Click on the `Locate` button to open the folder containing the generated app bundle
- Upload the app bundle to Play Console

# Health checks for native apps

To run health checks for the native apps, following commands can be used:

```
nx doctor bite-tribe-ios
```

or for Android

```
nx doctor bite-tribe-android
```

# Firebase Setup

To setup firebase emulators for local development, following steps are required:

In the root of the app, in `apps/bite-tribe/.env`, set the following line:

```
NX_APP_BITE_TRIBE_IS_DEV=true
```

Then, run the firebase emulators via:

```
nx firebase-serve bite-tribe-firebase
```

This will start the firebase emulators.
