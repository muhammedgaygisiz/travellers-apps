# bt-admin-bites-data-access

The Bite search behind the admin app's Bite lookup.

It calls `searchBites`, the same callable the consumer app's search drives. The
callable is the reusable part; the UI is not, because `libs/bite-tribe/search/*`
is `scope:bite-tribe` and this scope may not import it (issue #1476).

## Running unit tests

Run `nx test bt-admin-bites-data-access` to execute the unit tests.
