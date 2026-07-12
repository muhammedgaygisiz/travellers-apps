# Changelog

## build-84 (2026-07-12)

<!-- changelog-start-rev: e22b9720 -->
<!-- changelog-end-rev: d4809c5b -->

### Features

- list/map view on search (#995) (35313356)
- progress bar for bucket list (#994) (65b7845b)
- **910**: analytics events and dashboard (#990) (f6e56f84)
- **943**: switch from free input to restaurant select (#981) (34665389)
- verify restaurant from business app (#977) (4de3753a)
- **975**: add badges to profile (#976) (f8cd9982)
- search city (#974) (3544e0b2)

### Bug Fixes

- GA4 custom dimension display name cannot contain hyphen (#993) (2f91e51f)
- jumping camera in map on new bite coming in (#982) (da520de9)

### Documentation

- update todos (#985) (032740f5)
- model agnostic ssot (#984) (59be516f)

### Tests

- setup playwright and initiate e2e test login and create bite (#983) (1601ff84)

### Styles

- minor style and ux adjustments (#979) (883d9374)

### Chores

- bump version (#996) (dff9eca4)

## build-82 (2026-07-09)

<!-- changelog-start-rev: 565cacd7 -->
<!-- changelog-end-rev: e22b9720 -->

### Features

- notifications for change in ranking (#971) (b8e7ebdf)
- **968**: persist leader board (#970) (64812068)
- **966**: weekly resync for bite count (#969) (bdb263e4)
- client side price validation (#967) (b3646bc5)
- **909**: auto select currency by position (#965) (ec730941)
- **800**: user wants to use google maps (#964) (dd66c733)
- **961**: make like count faster (#963) (fb4c064b)

### Chores

- bump version (#962) (e56a3cde)

## build-81 (2026-07-05)

<!-- changelog-start-rev: 91988ac8 -->
<!-- changelog-end-rev: 565cacd7 -->

### Features

- show city and country (#958) (97487bdd)
- **894**: enrich bites with city and country (#955) (587c1ed7)
- **941**: show resto cancidates in dashboard (#951) (33029c83)
- cluster places from business tool (#949) (147847e6)
- **939**: list restaurant cluster candidates from eligible bites (#948) (7374bd71)
- **938**: preps for restaurant candidates (#947) (1b3242cc)

### Refactoring

- enable app check on firebase functions (#953) (71da0bd2)

### Documentation

- **778**: refinement (#946) (d9ca3ddd)

### Continuous Integration

- fix business app check (#956) (36bbfbb3)
- merge workflow (#950) (d2318bae)

### Chores

- minor adjustments (#957) (e0aa806b)
- build 80 (#937) (fd6f568e)

## build-80 (2026-07-02)

<!-- changelog-start-rev: 8e54d501 -->
<!-- changelog-end-rev: 91988ac8 -->

### Features

- impl missing decrement function on delete bite (#936) (8c3ff700)

### Bug Fixes

- **929**: fix styling of bite skeleton (#930) (642e9701)

### Refactoring

- **932**: gate firebase startup on app check initialization (#935) (075740be)

### Chores

- update ssot (#931) (5e33dc58)
- bump version (#928) (7aba60ac)

## build-79 (2026-06-30)

<!-- changelog-start-rev: 665e1022 -->
<!-- changelog-end-rev: 8e54d501 -->

### Features

- **592**: switch spinner to loading skeleton (#926) (6be3781e)
- unavailable menu items (#923) (8b65cba5)
- track build and version per user (#921) (d11454e6)
- **883**: leaderboard (#904) (00e5a5f7)
- **892**: setup conventional changelog (#893) (40c073b2)

### Bug Fixes

- **898**: fix localization of currencies (#900) (e84ca315)
- fix review not showing loading when bite is not received yet (#899) (1209674c)

### Refactoring

- cleanup (#922) (e5aeee5d)
- **916**: introduce aggregate for like type count (#919) (8541364f)

### Documentation

- doc #927 (8e54d501)

### Tests

- adjust test (24f540e6)

### Chores

- update sspot (#924) (70009772)
- increment build number (#920) (48945085)
- fix folder structure (0b3230dd)

## build-78 (2026-06-20)

<!-- changelog-start-rev: 69ada466 -->
<!-- changelog-end-rev: 665e1022 -->

### Features

- **888**: move mirroring new user to firestore to backend (#891) (69ada466)
- **879**: app check for android (#885) (c2c829e4)
- **878**: app check ios integration (#882) (0cdce120)
- **877**: implement app check for web (#880) (06ad3d9c)
- **875**: implement bite and restaurant search (#876) (29990c86)
- show full name in search; search respect display name, full name and email (#874) (f693d8d6)

### Documentation

- adjust changelog (665e1022)

### Chores

- increment build number and generate changelog (b975daae)
- setup conventional changelog and generate release notes (2da86e43)
