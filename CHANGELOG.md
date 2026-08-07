# Changelog

## build-92 (2026-08-07)

<!-- changelog-start-rev: b3aef3ab -->
<!-- changelog-end-rev: ac217b99 -->

### Features

- desktop layout for the Bites feed (#1253) (9925fdca)

### Bug Fixes

- stop re-syncing email verification for users who are already verified (#1255) (cb8b444d)
- remove disabling photo on offline causing not writing image status to document (#1252) (041e6bd1)
- cold start does not open the bite on deep-link click on web (#1249) (6eb7c48a)
- push notification lands on home instead of defined target (#1248) (0638bf04)

### Documentation

- check and document google places verification rate (#1257) (ac217b99)
- test run #4 (#1247) (7ca4da1c)

### Chores

- bump build 1.0.1-91 release (#1242) (b092d1c2)

## build-91 (2026-08-06)

<!-- changelog-start-rev: ecf83228 -->
<!-- changelog-end-rev: b3aef3ab -->

### Features

- zoom, swipe and jump to bite from gallery (#1241) (b3aef3ab)
- identify the account in deletion process (#1240) (c16b0af0)

### Bug Fixes

- fix resetting pre-seeded bite from menu item (#1239) (36717482)
- persist the first bucket list created from a bite (#1231) (#1238) (671bf0b6)
- bound home feed resynchronization after reconnect (#1230) (#1237) (cccd1596)
- fix no failed state or retry state for photo upload (#1236) (4a8f435a)
- setup necessary indexed for deleteOwnAccount function (#1228) (fbf79511)

### Documentation

- test run 3 and findings (only ios) (#1235) (dc5bd601)

### Chores

- prepare build 1.0.1-90 release (#1226) (2540079f)

## build-90 (2026-08-03)

<!-- changelog-start-rev: ad5d1c0c -->
<!-- changelog-end-rev: ecf83228 -->

### Features

- notify users and followers on a new country badge (#1212) (#1213) (fad19a12)
- **bite-tribe-firebase**: seed initial menu from bites when verifying a candidate (#1210) (3941b643)
- notify users when a new app version is available (#1194) (#1209) (41955d5b)

### Bug Fixes

- **1217**: fix misleading design and restructure settings page (#1225) (ecf83228)
- **1183**: recover from denied ios location permission (#1224) (af3d30d0)
- **privacy-policy**: show the policy in the selected app language (#1218) (#1223) (97bf8e82)
- registration hangs endlessly with no new auth user (#1222) (e6accb81)

### Refactoring

- **bite-tribe-firebase**: remove temporary leaderboard biteCount backfill (#905) (#1211) (a1560624)

### Documentation

- release test run #2 (#1220) (34b64bfb)
- **ssot**: scope sharing to Bites and drop the profile deep-link gap (#1190) (#1216) (fdc64e93)

### Tests

- **bite-tribe-business-e2e**: add business app e2e setup and first journey (#1214) (#1215) (0a40c1be)

### Chores

- prepare build 1.0.1-89 release (#1208) (ac2eba40)

## build-89 (2026-07-31)

<!-- changelog-start-rev: 2bf12a87 -->
<!-- changelog-end-rev: ad5d1c0c -->

### Features

- localize notification texts according users language (#1205) (b91b0231)
- surface profile visibility on own profile page (#1202) (45ba1527)
- **1184**: push notification handling in settings (#1199) (b6e65e25)
- **#1182**: in-app privacy and account deletion flow (#1195) (59cc880d)
- feedback and blocking state after registration (#1193) (b90126de)

### Bug Fixes

- make preferred currency and favorite currencies selection clear (#1207) (ad5d1c0c)
- confirm verification email resend in the app (#1204) (5dd643de)
- avoid raw translation keys after language switch while onboarding (#1201) (28f1756f)

### Documentation

- respecify notification and location permission handling (#1198) (383e798a)

### Styles

- adjust splash screen and assets to new design (#1206) (8c26bca4)

### Chores

- prepare build 1.0.1-88 release (#1192) (50f08726)

## build-88 (2026-07-28)

<!-- changelog-start-rev: 66b87bef -->
<!-- changelog-end-rev: 2bf12a87 -->

### Features

- loading spinner in the header (#1173) (691fab5e)
- loading skeleton for profile page (#1169) (c728afec)
- add more bites at same place (#1163) (2fa6c06f)
- **bite-tribe/bucketlist**: swipe a Bite in a bucket list to tick it off (#812) (#1162) (de738fde)

### Bug Fixes

- fix alignment and spacing for resto name and city in bite card (#1174) (45c6c269)
- fix my position marker on every click (#1171) (ae884398)
- use higher counter with garanty that own reaction counts (#1167) (2b891f18)

### Documentation

- outcome from test run 1 (#1191) (2bf12a87)
- correct the build and Crashlytics premises in the test charter (08a3268d)
- add the release candidate test charter (#1180) (e6836ca1)

### Tests

- extend e2e test suite (#1175) (bc121668)

### Chores

- bump version 87 (#1161) (2c8234d4)

## build-87 (2026-07-26)

<!-- changelog-start-rev: 8b6028b1 -->
<!-- changelog-end-rev: 66b87bef -->

### Features

- **bite-tribe/home**: land weekly bite notification on a dedicated page (#1120) (b5f315ef)
- **#933**: switch App Check startup failure to blocking behavior (#1066) (cf8cb97c)
- **1055**: my position button in bitemap (#1063) (4b50d59e)

### Bug Fixes

- **bite-tribe/profile**: sort profile bites from newest to oldest (#1160) (2d76db0c)
- **bite-tribe/store**: keep restaurant candidate bite evidence in the create flow (#1119) (feb86110)
- **bite-tribe-shell**: disable the pwa service worker on native platforms (#1116) (5c3a0378)
- **bite-tribe**: keep list pages clear of system navigation bar (#1065) (d087907f)
- **#1061**: fix connection to google workspace and email verifiction functions (#1062) (38087410)
- fix clipped reaction popover content (#1060) (ef1a915a)
- fixs for build 85 (#1057) (ab61ed2a)

### Refactoring

- **806**: check sensitive vars and tidy up env binding (#1068) (b10b2c84)
- **1059**: introduce aggregates for followers and following (#1064) (65ed5561)

### Documentation

- specify the three BiteTribe monetization channels (#1121) (#1159) (8baf38b9)
- specify resto claim table and order system (#1115) (a14f731b)

### Tests

- add e2e tests for use cases (#1058) (c60165b9)

## build-86 (2026-07-21)

<!-- changelog-start-rev: 6edf96f6 -->
<!-- changelog-end-rev: 8b6028b1 -->

### Bug Fixes

- recover push notification after reinstall (b02e82ec)
- recover location permission after deinstall (21de00a8)
- failing cap sync (742df939)
- **1053**: fix bugs from build 85 (#1056) (a4dd1f88)

### Documentation

- update loki references (cbb61b47)

### Tests

- fix e2e to loading behavior (8b6028b1)
- increase test coverage (a2e83048)
- increase test coverage (a43da21d)

### Chores

- sync android (5ea1d205)
- **1039**: upgrade independent lint and localization tooling (#1052) (4efd32b0)
- **1034**: upgrade Firebase client and backend tooling (incl. Admin 14 modular migration) (#1051) (1e0123ad)
- align the Capacitor 8 native stack (#1038) (#1050) (834221e5)
- update Storybook, Jest, and Playwright within current majors (#1049) (c96ae3c8)
- **1031**: update angular ngrx ionic (#1048) (cf53e82d)
- **1033**: upgrade Nx and Capacitor plugin to 23 (#1046) (6e53e734)
- bump version 85 (#1047) (501d4fa0)

## build-85 (2026-07-19)

<!-- changelog-start-rev: d4809c5b -->
<!-- changelog-end-rev: 6edf96f6 -->

### Features

- onboarding funnel analytics (#1027) (845c9bf2)
- **1016**: onboarding complete and coach marks (#1026) (dfcd2982)
- **1023**: onboarding location step (#1025) (0ecbc474)
- **1015**: onboarding currency language and notification steps (#1024) (17008434)
- **1014**: identity and visibility steps (#1022) (fbccbf6b)
- **1013**: onboarding assistant shell and step navigation (#1021) (a761c33f)
- **1012**: enforce case insensitive unique display name (#1020) (9a08f08e)
- **1011**: blocking entry gate for onboarding (#1019) (0bfc54b7)
- **1008**: email for email verification (#1009) (9f9fc587)
- **945**: harden restaurant candidate handling (#1005) (b2130e8e)
- **1002**: fill restaurant data from google places (#1004) (78c2e620)
- create resto candidate from create bite trigger (#1001) (a75abd44)
- **927**: various points to reduce risk of failing photo upload (#1000) (8c78effc)

### Bug Fixes

- place page bugs and cold start loading stuck (#998) (99762ccb)

### Refactoring

- fix lint warnings (#1028) (c507976c)

### Documentation

- refine dependency upgrade epic (#1041) (9830ab54)
- specify onboarding assistant epic 850 (#1018) (9450e997)
- update ssot (#999) (900bf5e6)

### Chores

- **1035**: migrate nx to 22.7.7 (#1045) (9bccbe92)
- pin Node.js 24 and audit migration constraints (#1044) (5c26812f)
- replace nx-loki with direct oblador/loki (#1043) (0c19eeb3)
- remove Cypress and consolidate E2E on Playwright (#1042) (b6e50afd)
- bump version (#997) (93a4d6e8)

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
