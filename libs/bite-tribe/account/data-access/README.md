# bite-tribe/account-data-access

This library was generated with [Nx](https://nx.dev).

Account lifecycle orchestration for the consumer app. It owns the account
deletion flow: calling the `deleteOwnAccount` backend cascade, refreshing a
stale sign-in through the account's own provider, and reporting the result.

## Running unit tests

Run `nx test bite-tribe/account-data-access` to execute the unit tests.
