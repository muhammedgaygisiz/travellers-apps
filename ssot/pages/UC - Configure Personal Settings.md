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
- User can turn BiteTribe push delivery on or off independently of the device's
  OS notification permission.
- When push is turned on, Settings requests an unspent OS permission, reports a
  denial with recovery guidance, or registers immediately for an existing
  grant.
- Turning the product preference off prevents backend delivery even when an old
  device token still exists.

## Supported Evidence

- `settings`
- Settings API.
- Exchange-rates API.
- Currency selector assets.
- `PageSettings`
- `SettingsService`
- `getTokens`

## Related Domains

- [[User]]
- [[Bite]]
