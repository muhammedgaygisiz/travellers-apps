# GitHub Copilot Instructions for Travellers Apps

## Project Overview

This is **BiteTribe**, a monorepo managed with Nx, built with Angular 20 and Ionic 8. The project consists of multiple applications including a main PWA (bite-tribe), a business portal (bite-tribe-business), and a CV app.

## Nx Monorepo Structure

### Architecture Layers

The project follows a strict architectural pattern with module boundaries enforced by ESLint:

- **apps/**: Application entry points
  - `bite-tribe`: Main consumer-facing PWA
  - `bite-tribe-business`: Business portal
  - `cv`: Personal CV application
  - `*-e2e`: End-to-end test apps using Playwright

- **libs/**: Shared libraries organized by scope and type
  - `bite-tribe/`: Feature libraries for the main app
  - `bite-tribe-business/`: Feature libraries for the business app
  - `bite-tribe-common/`: Shared domain libraries
  - `common/`: Cross-cutting utilities and UI components
  - `storybook-host/`: Storybook documentation host

### Library Types and Tags

Libraries are categorized by type tags that enforce dependency rules:

- **type:app**: Application entry points
- **type:shell**: Application shells and routing
- **type:feature**: Feature pages (smart components)
- **type:ui**: Presentational components (dumb components)
- **type:data-access**: Services and data management
- **type:store**: State management (NgRx)
- **type:api**: API interfaces and clients
- **type:model**: Domain models and types

### Dependency Rules

Follow these strict dependency rules enforced by ESLint:

- Apps can only depend on: shells and common libraries
- Shells can only depend on: features, stores, models, and common libraries
- Features can only depend on: UI components, data-access services, models, stores, and common libraries
- Data-access can only depend on: stores, API clients, models, and common libraries
- UI components can only depend on: other UI components, models, and common libraries
- Common libraries can only depend on other common libraries

## Angular & Ionic Conventions

### Component Architecture

Follow the **Container-Presentational Component Pattern**:

1. **Container Components** (Smart Components):
   - Located in `lib/integration/` folder
   - Named `*-container.component.ts`
   - Handle business logic, state management, and data fetching
   - Use services and data-access libraries
   - Minimal template, often inlined

2. **Presentational Components** (Dumb Components):
   - Located in `lib/components/` folder
   - Named `*.component.ts`
   - Pure, reusable components
   - Receive data via `@Input()`, emit events via `@Output()`
   - No business logic or service injection
   - Can have separate template and style files

### Page Library Structure

When creating a new page feature, follow this structure:

```
libs/<scope>/<page-name>/
├── page/
│   └── src/
│       └── lib/
│           ├── integration/
│           │   ├── <page-name>-container.component.ts
│           │   ├── <page-name>.service.ts
│           │   └── __specs__/
│           └── components/
│               ├── <component-name>/
│               │   ├── <component-name>.component.ts
│               │   ├── <component-name>.component.html
│               │   ├── <component-name>.component.scss
│               │   └── __specs__/
└── data-access/
    └── src/
        └── lib/
            └── <page-name>-data-access.service.ts
```

### Creating New Page Libraries

Use Nx generators with proper tags:

```bash
# Create page library
nx g @nx/angular:lib libs/<scope>/<page-name>/page --name=<scope>/<page-name> --tags=scope:<scope>,type:feature

# Create data-access library
nx g @nx/angular:lib libs/<scope>/<page-name>/data-access --name=<scope>/<page-name>-data-access --tags=scope:<scope>,type:data-access
```

After generation:

1. Delete default content from `src/lib` folder
2. Create `integration` and `components` folders
3. Export container component from `index.ts`
4. Add route in app's `routes.ts` with the container component

### Component Naming

- Components: `kebab-case` for selectors, PascalCase for class names
- Prefix: Use `bite` for bite-tribe scope components
- Services: `PascalCase` ending with `Service`
- Files: `kebab-case.component.ts`, `kebab-case.service.ts`

### Angular Features

- **Standalone Components**: Use standalone components (no NgModule)
- **Signals**: Prefer Angular signals for reactive state management
- **Control Flow**: Use new `@if`, `@for`, `@switch` syntax instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Dependency Injection**: Use `inject()` function for dependency injection
- **Explicit Return Types**: All functions must have explicit return types (`@typescript-eslint/explicit-function-return-type`)

## Testing Standards

### Jest Configuration

- **Test Framework**: Jest with jest-preset-angular
- **Test Location**: Tests should be in `__specs__/` folders alongside components
- **Naming**: `*.spec.ts`
- **Coverage**: Tests run with coverage reporting to Codecov
- **Zone**: Use `setupZonelessTestEnv` for `test-setup.ts`

### Jest Setup for Page Libraries

Include this configuration in `jest.config.ts`:

```typescript
const NODE_MODULES_TO_IGNORE = ['.*.mjs$', 'ionicons', '@ionic', '@stencil', '@capacitor'].join('|');

export default {
  displayName: '<library-name>',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../../coverage/libs/<path>',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        isolatedModules: true,
      },
    ],
  },
  transformIgnorePatterns: [`node_modules/(?!(${NODE_MODULES_TO_IGNORE}))`],
  snapshotSerializers: ['jest-preset-angular/build/serializers/no-ng-attributes', 'jest-preset-angular/build/serializers/ng-snapshot', 'jest-preset-angular/build/serializers/html-comment'],
};
```

### Visual Regression Testing

- **Tool**: Loki (upstream `oblador/loki` CLI, invoked directly — no Nx adapter)
- **Configuration**: `loki.config.js` at the repository root
- **Scripts**: `npm run loki:test`, `npm run loki:update`, `npm run loki:approve` (build Storybook first via `npm run build:storybook`). These run `tools/loki.mjs`, which serves the static build and targets `host.docker.internal` so the same command works locally and in CI.
- **Storybook**: Components documented in Storybook

## State Management

- **Primary**: NgRx (store, effects, entity, signals)
- **Component State**: Angular signals and component-store
- **Router State**: @ngrx/router-store

## Styling

- **Global Styles**: SCSS with Ionic theming
- **Component Styles**: SCSS files, scoped to components
- **CSS Framework**: Ionic CSS utilities
- **Icons**: Bootstrap Icons, Flag Icons, Ionicons

## Code Quality & Formatting

### ESLint

- Flat config format (eslint.config.mjs)
- Strict module boundary enforcement
- Explicit function return types required
- Angular ESLint rules for components and directives

### Prettier

- Configured via `.prettierrc`
- Auto-formatting on commit via lint-staged

### Stylelint

- SCSS linting with standard configs
- Configuration in `.stylelintrc.json`

### Husky & Commitizen

- Pre-commit hooks via Husky
- Commitizen for conventional commits
- Commitlint validates commit messages
- Format: `<type>(<scope>): <subject>`

### Commit Message Format

Use Commitizen (`npm run commit`) for commits. Follow conventional commits:

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

## Running the Project

### Development

```bash
# Install dependencies
npm install

# Serve main app
nx serve bite-tribe

# Serve business app
nx serve bite-tribe-business

# Run Storybook
npm run storybook
```

### Building

```bash
# Build specific app
nx build bite-tribe

# Build Storybook
npm run build:storybook
```

### Testing

```bash
# Run affected tests with coverage
npm test

# Run specific library tests
nx test <library-name>

# Run e2e tests
nx e2e bite-tribe-e2e
```

### Linting

```bash
# Lint all projects
nx run-many --target=lint --all

# Lint specific project
nx lint <project-name>
```

## Key Technologies

- **Framework**: Angular 20 with Ionic 8
- **Build Tool**: Nx 21.3
- **State Management**: NgRx 20
- **Testing**: Jest 30, Playwright 1.54
- **Styling**: SCSS, Ionic CSS
- **Mobile**: Capacitor 7
- **Backend**: Firebase (Firestore, Auth, Storage, Analytics)
- **Deployment**: Firebase Hosting
- **CI/CD**: GitHub Actions

## Firebase Integration

- **Firestore**: Database with geospatial queries (geofire-common)
- **Authentication**: Firebase Auth via @capacitor-firebase/authentication
- **Storage**: Image storage and compression
- **Analytics**: Firebase Analytics
- **Crashlytics**: Error tracking

## Mobile Development

- **iOS**: Capacitor iOS project in `apps/bite-tribe-ios`
- **Android**: Capacitor Android project in `apps/bite-tribe-android`
- **Plugins**: Camera, Geolocation, Filesystem, App Launcher

## Path Aliases

Import from libraries using path aliases defined in `tsconfig.base.json`:

```typescript
import { MyComponent } from 'bite-tribe/home';
import { MyService } from 'bite-tribe/home-data-access';
import { Utils } from 'utils';
```

## Documentation

- Main README: Project setup and quick start
- ssot/pages/: the SSOT graph, which is the source of truth for product, domain,
  architecture, implementation and release context
- ssot/pages/Architecture - Nx Workspace.md: apps, library families, boundary rules
- ssot/pages/Implementation - Testing.md: test and e2e commands
- Storybook: Component documentation

## Best Practices

1. **Keep it DRY**: Extract reusable logic into common libraries
2. **Single Responsibility**: Each component/service should have one clear purpose
3. **Type Safety**: Use TypeScript strictly, no `any` types
4. **Explicit Returns**: Always specify function return types
5. **Test Coverage**: Write tests for new features and bug fixes
6. **Component Isolation**: Presentational components should be pure and testable
7. **Smart Routing**: Use container components for route targets
8. **Nx Graph**: Check dependency graph with `nx graph` before adding dependencies
9. **Affected Commands**: Use `nx affected` for efficient CI/CD
10. **Module Boundaries**: Respect architectural constraints enforced by ESLint

## Common Commands Reference

```bash
# Generate new library
nx g @nx/angular:lib <name>

# Generate new component
nx g @nx/angular:component <name> --project=<project-name>

# View dependency graph
nx graph

# Show project structure
nx show project <project-name>

# List affected projects
nx show projects --affected

# Run Nx report
nx report
```

## Notes

- Default branch: `develop`
- PWA: Progressive Web App with service worker
- Responsive: Mobile-first design with tablet support
- Offline: IndexedDB via Dexie for offline support
- i18n: Transloco for internationalization

# Versioning Tool

The workspace uses Git and GitHub for version control.
On Push `nx affected --base=develop -t test --parallel --coverage --coverageReporters=text`
is executed to run tests. If the coverage decreases the push is blocked, so it is
crucial to have tests for any new code added. nx runs the tests per library and checks the
coverage per library. So if any library has less coverage than before the push will be blocked.

# Data fetching

Data fetching is done in the effects layer of the ngrx store. For that,
the route is checked and if it is the correct one the data is fetched from the backend.
The data is then stored in the according slice. The container receives the data from the store
via its dedicated service, which itself uses the according data-access layer, which uses the
store service. The store service encapsulates ngrx, so that the rest of the application is not
dependent on ngrx directly.

# Icons

When a new icon is used (Ionic Icons Library) it needs to be imported and added to the `addNecessaryIcons` function.
