# Changelog

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
