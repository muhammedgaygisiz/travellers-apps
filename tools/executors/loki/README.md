# Usage of the executor

To use the executor (run loki tests), it has to be build first.
The root `package.json` has the run script `compile:loki:executor`
to run the build.

The build's result in a `impl.js` which is used by `nx` to run
loki with everything required.

To execute the loki tests run `nx loki prices`.
