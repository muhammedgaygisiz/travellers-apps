Accoding to NX best practices, libs can be of the types:

- feature (smart components - components with business logic and injected services)
- ui (dumb components - presentational)
- data-access (services and ngrx files)
- utility (helper functions)

To create a feature use following command

`npm run nx -- g lib prices/card/feature`

When nx cli asks for a generator to use, pick `@nx/angular:library`.

To add a component to the feature use following command

`npm run nx -- g c card --project=prices-card-feature`

For a plain library without framework specifics use following command

`npm run nx -- g @nx/workspace:lib utils-common`
