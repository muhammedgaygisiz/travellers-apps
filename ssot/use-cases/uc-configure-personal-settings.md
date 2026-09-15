# UC - Configure Personal Settings

## Status

**Level:** L0.
Supported today. The settings page carries theme, currency with a favourites shortlist,
language, the location-permission state, and the per-installation notification list [#1184] put
in place of the old account-wide switch. Two fields on the `Settings` model are not controls
here: `nearby`, which nothing in settings sets, and `pushNotifications`, retired by [#1184]. The
email-updates switch is present and disabled.

## Goal

An account can make the app speak its language, show money in its currency, and stop
notifications reaching a device it no longer wants them on. This page owns the settings
surface and what each preference controls; the delivery state its notification list switches
belongs to [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md).

## Actors

- **Bite Creator** - opens settings and maintains its own preferences, and switches
  notification delivery for any of its registered installations.

## Flow

- User opens settings.
- **Theme** - light or dark.
- **Currency** - the currency amounts are shown in, with a shortlist of favourite currencies
  so a user switching between a few does not scroll the whole list. Rates come from the
  exchange-rates API.
- **Language** - the app's language, and the same saved choice the Localization Contract in
  [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) reads when it translates a
  notification in the backend.
- **Notification delivery**, per installation rather than per account. See
  `Notification Management` below.
- **Location permission** - settings shows whether the OS permission is granted and leads to
  the app's own page in the system settings when it is not. The permission is collected during
  onboarding ([#1023]); `Settings.location` records the answer rather than being a preference
  set here.
- **Email updates** - the switch is rendered and is **disabled**, and nothing in the app sends
  an email update. It is the same shape of control [#1184] removed for push: visible, and
  backed by nothing. Whether it is built or dropped is undecided ([#1606]).
- `Settings.nearby` is on the model and is not a control on this page. It holds the radius the
  Home feed's optional nearby filter uses, in metres; nothing writes it but the store's initial
  value, so the filter is effectively a constant. Whether it becomes a control is undecided
  ([#1606]).

## Notification Management

Issue [#1184]
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
- OS permission is shown separately from BiteTribe's delivery state, and the
  current installation's switch reflects both: an OS permission the user never
  granted, or took away again, shows the row off whatever its stored `enabled`
  flag says. The flag is what BiteTribe was told to send, not what arrives
  (issue [#1386]).
- A muted current device is explained and given a way back on both platforms:
  the OS dialog while the prompt can still be spent, and the app's own page in
  the system settings either way. Switching a muted row back on asks the OS
  rather than writing the delivery flag.
- The list is manageable from any signed-in surface. A platform that cannot
  receive push itself, such as the web build, says so and still lists and
  switches the account's other installations.
- Installation deletion or permanent revocation is outside issue [#1184].
- The account-level `Settings.pushNotifications` field is retired; existing
  stored values become ignored legacy data.

## MVP Classification

**[MVP]** - the notification-delivery list, language, and currency. The delivery state is
classified `[MVP]` by [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) and this is the
only surface that exposes it, so without it an account can stop notifications only at the OS.
Language is what the app and every notification are rendered in, and the app ships in eleven of
them. Currency is what reported prices mean: a price read in the wrong one misinforms rather
than inconveniences, and prices are the point of the product.

**[Secondary]** - theme, the favourite-currency shortlist, and the location-permission row,
which reports a state collected elsewhere rather than setting one.

## App Store Review Area

Relevant. This is where a user reads back the OS permission states the app asked for and is
sent to the app's own page in the system settings to change them - location here, and
notifications through the list below. The permissions themselves are requested in onboarding
and at the point of use, not here, and the data types behind them are declared in
[Implementation - Store Declarations](../implementation/store-declarations.md).

## Supported Evidence

- `settings`
- Settings API.
- Exchange-rates API.
- Currency selector assets.

## Related Domains

- [User](../domain/user.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover and the traveler
- [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) - the delivery state this page's
  notification list switches, and the Localization Contract that reads the saved language
- [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md) - where the location permission is collected
- [UC - Discover Bites](uc-discover-bites.md) - the Home feed whose optional nearby filter reads `Settings.nearby`
- [Implementation - Store Declarations](../implementation/store-declarations.md)

[#1023]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1023
[#1184]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1184
[#1386]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1386
[#1606]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1606
