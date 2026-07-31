# UC - Configure Personal Settings

## Status

Supported today.

## Goal

Users can configure app-specific preferences that make discovery and creation more relevant.

## Actors

- User
- Food lover
- Traveler

## Current Flow

- User opens settings.
- User maintains preferences such as currency-related choices.

## Notification Management

Issue [#1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184)
replaced the disabled account-wide Push Notifications switch with
installation-specific management:

- Settings lists the user's registered app installations.
- Every active installation has its own BiteTribe delivery switch, backed by
  the push token's `enabled` state.
- The current installation is identified by a persistent, locally generated
  installation UUID and is labelled separately from other or legacy devices.
- When the current installation is not registered, an explicit **Receive
  notifications on this device** action runs the contextual permission and
  registration flow.
- OS permission is shown separately from BiteTribe's delivery state. A denied
  permission receives device-settings recovery guidance.
- The list is manageable from any signed-in surface. A platform that cannot
  receive push itself, such as the web build, says so and still lists and
  switches the account's other installations.
- Installation deletion or permanent revocation is outside issue #1184.
- The account-level `Settings.pushNotifications` field is retired; existing
  stored values become ignored legacy data.

## Supported Evidence

- `settings`
- Settings API.
- Exchange-rates API.
- Currency selector assets.

## Related Domains

- [[User]]
- [[Bite]]
