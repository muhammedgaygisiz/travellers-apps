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

```
nx serve bite-tribe
```

- The application will be available at [http://localhost:4200](http://localhost:4200)

# Howto setup a new page

- Create a page library:

```


# TravellersApps

- [Demo](https://prices-bec89.web.app)
- [Storybook](https://storybook-e0333.firebaseapp.com/)
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
