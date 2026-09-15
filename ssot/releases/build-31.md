# build-31

|            |            |
| ---------- | ---------- |
| Date       | 2025-07-19 |
| Git tag    | `build-31` |
| Git commit | `1b42cf7c` |

Part of the [changelog](changelog.md).

## Commits

- initial commit (`fa9edb891`)
- Cleanup main README file ([#1]) (`c629083c1`)
- Add prices angular app (`ced3d0c24`)
- Integrate Ionic (`ae900f1aa`)
- Add home module (`79d63e81c`)
- Refactore home to own library (`c2d46761e`)
- Extract shell module from prices app (`a49e2f9b6`)
- Initial pipeline (`f55873fae`)
- Run on push event (`e00038952`)
- Setup node environment and introduce build step (`7ce20a1c6`)
- Setup node environment and introduce build step II (`37710d26e`)
- Setup node environment and introduce build step III (`c627f9fd7`)
- Add test step to build pipeline (`1a2597fcb`)
- Add continue-on-error flag (`d020b1b11`)
- Add deployment steps (`b17942eae`)
- Add deployment steps II (`36b6b587a`)
- Merge pull request [#3] from muhammedgaygisiz/setup-build-pipeline (`0bfbf665b`)
- Add firebase.json and firebaserc (`a3f8c4f0f`)
- Add links to read me (`23143806d`)
- Change title (`853ce8d66`)
- Prepare for Preview of PRs (`0aa058ca9`)
- Merge pull request [#4] from muhammedgaygisiz/docs/demo-and-project-site (`ecaa6b15b`)
- Fix listing in read me file (`eb6f68e07`)
- Test pr preview ([#5]) (`2b0ae32b9`)
- Add Setup history file (`3235cf3a5`)
- Setup storybook ([#6]) (`b60875ede`)
- Add storybook link to readme ([#7]) (`031cabd60`)
- Implement add price view including footer toolbar to navigate there ([#8]) (`9a57dcb16`)
- Introduce header toolbar feature ([#9]) (`be591a0b2`)
- Add initial card component ([#10]) (`c31c4642d`)
- Introduce container for home page ([#11]) (`d0035b779`)
- Introduce service for home page integration ([#15]) (`10ac09664`)
- 13 setup ngrx ([#17]) (`a5669c246`)
- 14 move dummies from container to store ([#18]) (`47451cc5f`)
- Switch to entity manager for most searched items ([#21]) (`0118315dc`)
- Move dummies to effect ([#23]) (`01c282da8`)
- 25: Create page to add an item ([#28]) (`6e60102bd`)
- Introduce container for add item page ([#33]) (`8192b04de`)
- Update nx from 14.1.9 to 14.7.3 [#26] ([#34]) (`ffaa9c8e4`)
- 30: Implement form on add item page ([#36]) (`6c558e890`)
- Fix styling for error messages ([#37]) (`87a43a77f`)
- 27: Setup husky and lint-staged ([#40]) (`672ec018b`)
- 31: Use nx affected for build and build-storybook ([#42]) (`07aee9201`)
- Remove add button from page ([#45]) (`dfeaf5b7b`)
- 46: Fix nx affected build on ci ([#47]) (`5ab2c817d`)
- [#48]: Fix storybook deployment ([#49]) (`2736b2a5c`)
- Add build pipeline status badge (`2e39f7f21`)
- 24: Move dummies to firebase ([#50]) (`b291928f5`)
- [#52]: Initial loki setup ([#53]) (`15ab948af`)
- 51: setup loki and add executor for nx ([#54]) (`a927e1f7a`)
- Extract content from card component ([#56]) (`e79901356`)
- Upgrade nx ([#58]) (`5c575f3e9`)
- [#59]: Fix tests and add test to build pipeline ([#60]) (`ec3250842`)
- Add linting to pipeline ([#65]) (`c84066265`)
- [#61]: Add field for image src ([#66]) (`5b54f9c4c`)
- [#68]: introduction and introducing capacitor ([#69]) (`f15731734`)
- [#63]: implement authentication page ([#72]) (`b32bf07f0`)
- [#71]: emit auth action and handle in effect ([#73]) (`5f7a5427f`)
- Upgrade nx ([#77]) (`890d8d057`)
- [#78]: add your location card ([#79]) (`8a3196bb9`)
- [#81]: get current location and show in location card ([#82]) (`a742f6743`)
- [#83]: extract password validation component to own library ([#85]) (`2dba1d77e`)
- [#88]: User wants the location field in the add item page to be prefilled with his/her location ([#89]) (`431b237d8`)
- [#62] user wants to add an item ([#90]) (`b15785a0d`)
- [#86]: User wants to see items depending on his/her location (`ba763c747`)
- Implementation using firebase auth guard ([#96]) (`d558fcbba`)
- [#94]: Prevent making request in unauthorized state ([#97]) (`225380250`)
- [#98]: User wants email validation and label 'Email' in auth page and number validation in add-item page ([#100]) (`633686e83`)
- [#67]: User wants to see a preview of the image on adding an item (`fb55e3fe9`)
- [#105]: Dev wants to upgrade nx 15 (`5461f0b33`)
- [#84]: Dev wants to add cypress test for login ([#108]) (`f54f524c4`)
- [#107]: Nils want to use marble tests ([#110]) (`a018ec682`)
- [#111]: dev wants to add service worker to prices app ([#114]) (`61c9b2ae9`)
- [#111]: Adjustments for icons ([#115]) (`d40dbf4f3`)
- [#64]: Developer wants a registration page ([#118]) (`c6d3b3dc1`)
- [#75]: User wants to register ([#120]) (`dff79e82c`)
- refactor(prepare-commit-msg): setup commitizen ([#122]) (`560aef80c`)
- feat: user can now remove the location filter ([#127]) (`0afc94d9b`)
- refactor: switch from loki update to loki approve ([#128]) (`a465e3479`)
- ci(pipeline.yml): add code coverage report via code cov ([#129]) (`48e38e110`)
- refactor(most-searched.service.ts): renamed collection in firestore ([#132]) (`4132991ac`)
- build: update nx to 15.0.5 ([#134]) (`d4bfa9deb`)
- build: fix version of angular/pwa dependency ([#135]) (`4b0eadbff`)
- chore(project.json): add manifest.webmanifest to assets ([#136]) (`751ed4b8e`)
- feat(prices): add google sign in to auth page ([#139]) (`421ce54af`)
- chore: configure sw resources ([#142]) (`51c3d2aa4`)
- chore: add selector for isOnline (`40fb0ddcd`)
- feat: migrate kosaml to this repository ([#95]) ([#137]) (`8767c9b6f`)
- chore: upgrade nx to 15.1.0 ([#148]) (`31176cb4d`)
- feat: configure loki for kosmal ([#150]) (`c3a2923ab`)
- ci: initial improvement for ci cd ([#146]) (`2553cd7a5`)
- chore: migrate to nx 15.5.1 ([#154]) (`38bf4fe1e`)
- feat: introduce standalone components ([#102]) ([#156]) (`69513af08`)
- feat: get rid of some constructors ([#161]) (`cdb1b1a14`)
- feat: dev wants to switch to standalone components ([#162]) ([#163]) (`ace5bd0f1`)
- feat(kosaml): dev wants to migrate to angular material 15 ([#159]) ([#165]) (`172f3871b`)
- chore: upgrade nx version to 15.6.3 ([#166]) (`6b0d693aa`)
- feat(all): setup storybook linter to workspace ([#167]) ([#170]) (`b26befd21`)
- fix(kosaml): fix not navigating to task scenario or use scenario ([#160]) ([#173]) (`84e9f598e`)
- docs: create blog list to be read weekly ([#174]) (`ba25e69e3`)
- docs(kosaml): add mdx2 doc-only with example mdx file ([#176]) (`768889b9e`)
- chore: upgrade dependencies ([#180]) (`056a82aa4`)
- [#178]: use stylelint ([#181]) (`070aec5f5`)
- refactor: switch to new control flow syntax ([#182]) (`41ff4d5af`)
- chore: update dependencies ([#183]) (`6c7c6fc72`)
- 184 dev wants to add localization ([#185]) (`0c27d5e24`)
- 187 dev wants to upgrade nx ([#188]) (`60b8377bd`)
- 187 dev wants to upgrade nx ([#189]) (`95116be71`)
- refactor(prices): replace @ngneat/transloco with @jsverse/transloco ([#191]) (`79fd70915`)
- 192 user wants a burger menu to logout and switch languages ([#193]) (`05e76e73a`)
- 194 user wants to take a picture of the product ([#195]) (`72b3cd3e5`)
- chore: upgrade dependencies ([#197]) (`04b45d679`)
- 200 start finance project ([#201]) (`3e1887f54`)
- feat: introduce signal input/output and signal store to finances app ([#202]) (`5ac91c20b`)
- 164 migrate cv to workspace ([#206]) (`d8df793ec`)
- 204 update dependencies ([#205]) (`162f25736`)
- fix: typo ([#207]) (`93c151de8`)
- ci: fix job step name ([#208]) (`0a2f1d607`)
- chore: delete nx-cache (`490d04581`)
- 209 use nx loki ([#210]) (`48d93d405`)
- ci: fix naming of param ([#211]) (`6549960f2`)
- chore: fix buildpipeline and use loki in pipeline job ([#212]) (`3801704f3`)
- ci: update nx-loki ([#213]) (`77cee77fb`)
- feat(nx-cloud): set up nx workspace ([#214]) (`1d3a5c78a`)
- chore: move cap out of prices and initiale impl of loki reference update pipeline (`da1fb8714`)
- ci: fix setup step ([#216]) (`f347dd738`)
- ci: introduce variable for branch name and pass it in in steps (`b4be5f443`)
- ci: pass github token to sub action (`2027b55f3`)
- ci: commit new references (`3db35937f`)
- chore: update loki references ([#217]) (`f58cb93f0`)
- ci: fix base branch in pr creation (`e58c3d9e9`)
- chore: update nx-loki (`951a8fb29`)
- chore: update nx-loki (`5fbaae1c0`)
- ci: --allow-empty for loki update (`52ab3d363`)
- ci: fix commit command (`28073f3a3`)
- chore: naming (`499c90617`)
- ci: extend pipeline to execute steps only if has_changes (`177a98d30`)
- ci: switch lint step (`8f902f6bb`)
- ci: reduce linting to one step (`54d0b6544`)
- ci: introduce single stylelint job (`3229b11f1`)
- fix: fix ci (`7ba84358d`)
- chore: order of jobs (`4057fdcec`)
- chore: setup capacitor for finances ([#218]) (`495e27631`)
- ci: fix e2e tests (`54c66745c`)
- feat: add bank page ([#219]) (`806ac2a82`)
- feat: save bank and payment in firestore ([#220]) (`4a0ca9f49`)
- feat: load and edit payments ([#221]) (`12fc65e53`)
- feat: overall and account payments visualization (d3.js) ([#222]) (`5be397c65`)
- chore: Integrate auth to finances ([#223]) (`630a0c803`)
- feat: initialize budget planner ([#224]) (`16e3fad96`)
- chore: setup pages according ([#225]) (`4210241c7`)
- chore: Integrate auth to finances ([#226]) (`4aa1da6c9`)
- ci: introduce build and deploy of cv ([#227]) (`c19600b57`)
- feat: split cv deploy from pipeline ([#228]) (`bf0fef0fe`)
- ci: separate prices deployment from pipeline ([#229]) (`f456fc48d`)
- feat: watch firestore changes & styling ([#230]) (`3c8987ce2`)
- feat: fix splush screen ([#231]) (`dfa9d8325`)
- fix: fix not loading data after login ([#232]) (`00b5dba32`)
- refactor: naming of lib and api service ([#233]) (`635cd936d`)
- ci: fix naming ([#234]) (`0a3d78981`)
- chore: fix firebase options ([#235]) (`20108d0ba`)
- ci: fix integrating env vars into deploy build ([#236]) (`73d31cf53`)
- chore: relase test version on ios ([#237]) (`b7b7fb39d`)
- chore: cleanup ([#238]) (`80dec2120`)
- chore: cleanup, initialize tribe bite app shell and start home and bite page ([#239]) (`46fe71b81`)
- ci: change type of skip nx cache param to boolean ([#240]) (`290a128d8`)
- ci: skip nx cache ([#241]) (`45c491012`)
- chore: fix tags ([#242]) (`7ff2805e3`)
- fix: fix sass warning ([#243]) (`50a74d773`)
- chore: add eslint rule for bite tribe ([#244]) (`314cd954a`)
- ci: fix build and disconnect from nx-cloud ([#245]) (`ec831e641`)
- ci: add pipeline for bite tribe ([#246]) (`2f9a6d1fb`)
- ci: extend firebase files ([#247]) (`e27234d2d`)
- ci: fix ci var names ([#248]) (`7dca3af61`)
- fix: fix geolocation bug in browser ([#249]) (`e36c477dd`)
- feat: compress taken picture ([#250]) (`111e06c91`)
- feat: Bite detail page ([#251]) (`0b4bbb69f`)
- feat: save tags ([#252]) (`125541cb6`)
- 253 implement new review ([#255]) (`e90c59256`)
- 257 implement like button ([#271]) (`f6c8cf5ac`)
- fix: improve auth and page change handling ([#272]) (`953ebb40d`)
- 257 implement like button 2 ([#275]) (`f8c295e73`)
- 276 highlight like type user selected ([#277]) (`afdacd737`)
- 278 remove like on second click ([#279]) (`88af2fa6d`)
- 254 implement distance calculation ([#280]) (`e1863b38f`)
- featu: login with google and apple ([#282]) (`9207ef813`)
- refactor: calc distance in service instead of template ([#283]) (`da243a5a0`)
- 256 implement currency dropdown ([#284]) (`5c8988f45`)
- feat: restaurant profile page ([#285]) (`fdecb9647`)
- feat: restyle likes ([#289]) (`ba36d1e0d`)
- 261 initial implementation of settings page ([#290]) (`4cf28f10a`)
- feat: initial desktop layout ([#291]) (`80d053e8b`)
- 286 implement distance calculation for restaurant and save settings to firebase ([#292]) (`48da4115f`)
- 263 implement display name of user for reviews ([#293]) (`4d89036ff`)
- feat: introduce menu page and placeholder image ([#295]) (`4dd66d320`)
- 297 start restaurant business tool bite distribution center ([#298]) (`0a8712348`)
- ci: rename deployment pipeline ([#299]) (`96dbbc682`)
- ci: fix firebase deployment ([#300]) (`e121c7413`)
- ci: fix bt business firebase deployment 2 ([#301]) (`539f05229`)
- feat: bt-business logout feat ([#303]) (`694786dd4`)
- feat: logout for bt business ([#304]) (`ae4ef0407`)
- ci: fix binding env to pipeline ([#305]) (`84ff9ba12`)
- 264 build and deploy ios version ([#306]) (`7b19cce72`)
- 264 ios app logo, camera access ([#307]) (`2d0828ef3`)
- chore: set up analytics ([#311]) (`3d10c9f0c`)
- chore: set up analytics for ios ([#312]) (`9920fdff4`)
- 313: implement create restaurant feature ([#314]) (`9a7f66ec3`)
- 313 maintain menu feature ([#317]) (`73e9771a3`)
- feat: map feature ([#321]) (`19191b2a9`)
- fix: fix ios bug ([#323]) (`8f67f7006`)
- feat: add variants to dishes ([#337]) (`ef42cfda4`)
- feat: read gps position from image ([#338]) (`c25ae6b1a`)
- fix: fix ios take gps from image ([#346]) (`62aed1f2b`)
- chore: update build version ([#347]) (`10b8bc430`)
- fix: fix ios too big image bug ([#349]) (`067d86377`)
- 302 impl change bite feature ([#350]) (`4ddb9ebfe`)
- chore: prepare 1.0.1 build 9 ([#351]) (`ad33639a4`)
- fix: fix title of edit bite ([#352]) (`4c69c3f1f`)
- 287 implement bite query for restaurant ([#353]) (`ae324f516`)
- 296 create bite from menu item ([#354]) (`c866fdf49`)
- feat: maintain social media links for restaurants ([#355]) (`5458ab9d0`)
- chore: fix memory leak ([#356]) (`716d3fbe4`)
- 339 kristina wants to have a bucket list to put seen bites in it ([#357]) (`890e8eaaf`)
- fix: diverse fixes ([#358]) (`9e76b84b6`)
- chore: prepare ios build ([#359]) (`e89c18468`)
- 360 kristina wants to delete bites from my bites page ([#361]) (`34da3ba9c`)
- 325 business side would like to change the position on the menu items and categorizes too ([#362]) (`353e2dd84`)
- 364 user wants to make himherself public ([#365]) (`04174e014`)
- feature(368): proper cleanup after logout and tracking screen on firebase analytics ([#375]) (`29ff0e0ed`)
- feat(372): add nav to resto on bite detail page ([#376]) (`4e085d300`)
- 369 user wants a link to open gps position in maps eg google maps and get navigation instructions ([#377]) (`10827b232`)
- feat(378): map view chip and map view from home screen ([#381]) (`d0c5ef322`)
- feat(382): user wants to see the profile of a public user and maintains own profile ([#384]) (`30a1d58d5`)
- 366 show warning for failed gps location on home feed ([#386]) (`977a06fec`)
- chore: update build version ([#387]) (`b1b221951`)
- feat([#380]): Add custom filters functionality to bite-tribe home screen ([#389]) (`4809f1b91`)
- fix(390): user cant create bites with some images ([#391]) (`18f12f046`)
- feat([#379]): implement nearby filter ([#392]) (`3eed094df`)
- feat: hint and validation for price input ([#395]) (`9f7bd4f2e`)
- feature(315): crop image ([#413]) (`68f95f31a`)
- refactor(396): user is persisted on registration ([#415]) (`90d2574bd`)
- 416 it is not possible to enter a in the price field just on ios ([#417]) (`6e5edd9c5`)
- feat(270): better ux on image upload ([#418]) (`99b3e96bc`)
- feat(335): show age of bite entry; add creation date of bite ([#419]) (`1b42cf7c0`)

[#1]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1
[#3]: https://github.com/muhammedgaygisiz/travellers-apps/issues/3
[#4]: https://github.com/muhammedgaygisiz/travellers-apps/issues/4
[#5]: https://github.com/muhammedgaygisiz/travellers-apps/issues/5
[#6]: https://github.com/muhammedgaygisiz/travellers-apps/issues/6
[#7]: https://github.com/muhammedgaygisiz/travellers-apps/issues/7
[#8]: https://github.com/muhammedgaygisiz/travellers-apps/issues/8
[#9]: https://github.com/muhammedgaygisiz/travellers-apps/issues/9
[#10]: https://github.com/muhammedgaygisiz/travellers-apps/issues/10
[#11]: https://github.com/muhammedgaygisiz/travellers-apps/issues/11
[#15]: https://github.com/muhammedgaygisiz/travellers-apps/issues/15
[#17]: https://github.com/muhammedgaygisiz/travellers-apps/issues/17
[#18]: https://github.com/muhammedgaygisiz/travellers-apps/issues/18
[#21]: https://github.com/muhammedgaygisiz/travellers-apps/issues/21
[#23]: https://github.com/muhammedgaygisiz/travellers-apps/issues/23
[#26]: https://github.com/muhammedgaygisiz/travellers-apps/issues/26
[#28]: https://github.com/muhammedgaygisiz/travellers-apps/issues/28
[#33]: https://github.com/muhammedgaygisiz/travellers-apps/issues/33
[#34]: https://github.com/muhammedgaygisiz/travellers-apps/issues/34
[#36]: https://github.com/muhammedgaygisiz/travellers-apps/issues/36
[#37]: https://github.com/muhammedgaygisiz/travellers-apps/issues/37
[#40]: https://github.com/muhammedgaygisiz/travellers-apps/issues/40
[#42]: https://github.com/muhammedgaygisiz/travellers-apps/issues/42
[#45]: https://github.com/muhammedgaygisiz/travellers-apps/issues/45
[#47]: https://github.com/muhammedgaygisiz/travellers-apps/issues/47
[#48]: https://github.com/muhammedgaygisiz/travellers-apps/issues/48
[#49]: https://github.com/muhammedgaygisiz/travellers-apps/issues/49
[#50]: https://github.com/muhammedgaygisiz/travellers-apps/issues/50
[#52]: https://github.com/muhammedgaygisiz/travellers-apps/issues/52
[#53]: https://github.com/muhammedgaygisiz/travellers-apps/issues/53
[#54]: https://github.com/muhammedgaygisiz/travellers-apps/issues/54
[#56]: https://github.com/muhammedgaygisiz/travellers-apps/issues/56
[#58]: https://github.com/muhammedgaygisiz/travellers-apps/issues/58
[#59]: https://github.com/muhammedgaygisiz/travellers-apps/issues/59
[#60]: https://github.com/muhammedgaygisiz/travellers-apps/issues/60
[#61]: https://github.com/muhammedgaygisiz/travellers-apps/issues/61
[#62]: https://github.com/muhammedgaygisiz/travellers-apps/issues/62
[#63]: https://github.com/muhammedgaygisiz/travellers-apps/issues/63
[#64]: https://github.com/muhammedgaygisiz/travellers-apps/issues/64
[#65]: https://github.com/muhammedgaygisiz/travellers-apps/issues/65
[#66]: https://github.com/muhammedgaygisiz/travellers-apps/issues/66
[#67]: https://github.com/muhammedgaygisiz/travellers-apps/issues/67
[#68]: https://github.com/muhammedgaygisiz/travellers-apps/issues/68
[#69]: https://github.com/muhammedgaygisiz/travellers-apps/issues/69
[#71]: https://github.com/muhammedgaygisiz/travellers-apps/issues/71
[#72]: https://github.com/muhammedgaygisiz/travellers-apps/issues/72
[#73]: https://github.com/muhammedgaygisiz/travellers-apps/issues/73
[#75]: https://github.com/muhammedgaygisiz/travellers-apps/issues/75
[#77]: https://github.com/muhammedgaygisiz/travellers-apps/issues/77
[#78]: https://github.com/muhammedgaygisiz/travellers-apps/issues/78
[#79]: https://github.com/muhammedgaygisiz/travellers-apps/issues/79
[#81]: https://github.com/muhammedgaygisiz/travellers-apps/issues/81
[#82]: https://github.com/muhammedgaygisiz/travellers-apps/issues/82
[#83]: https://github.com/muhammedgaygisiz/travellers-apps/issues/83
[#84]: https://github.com/muhammedgaygisiz/travellers-apps/issues/84
[#85]: https://github.com/muhammedgaygisiz/travellers-apps/issues/85
[#86]: https://github.com/muhammedgaygisiz/travellers-apps/issues/86
[#88]: https://github.com/muhammedgaygisiz/travellers-apps/issues/88
[#89]: https://github.com/muhammedgaygisiz/travellers-apps/issues/89
[#90]: https://github.com/muhammedgaygisiz/travellers-apps/issues/90
[#94]: https://github.com/muhammedgaygisiz/travellers-apps/issues/94
[#95]: https://github.com/muhammedgaygisiz/travellers-apps/issues/95
[#96]: https://github.com/muhammedgaygisiz/travellers-apps/issues/96
[#97]: https://github.com/muhammedgaygisiz/travellers-apps/issues/97
[#98]: https://github.com/muhammedgaygisiz/travellers-apps/issues/98
[#100]: https://github.com/muhammedgaygisiz/travellers-apps/issues/100
[#102]: https://github.com/muhammedgaygisiz/travellers-apps/issues/102
[#105]: https://github.com/muhammedgaygisiz/travellers-apps/issues/105
[#107]: https://github.com/muhammedgaygisiz/travellers-apps/issues/107
[#108]: https://github.com/muhammedgaygisiz/travellers-apps/issues/108
[#110]: https://github.com/muhammedgaygisiz/travellers-apps/issues/110
[#111]: https://github.com/muhammedgaygisiz/travellers-apps/issues/111
[#114]: https://github.com/muhammedgaygisiz/travellers-apps/issues/114
[#115]: https://github.com/muhammedgaygisiz/travellers-apps/issues/115
[#118]: https://github.com/muhammedgaygisiz/travellers-apps/issues/118
[#120]: https://github.com/muhammedgaygisiz/travellers-apps/issues/120
[#122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/122
[#127]: https://github.com/muhammedgaygisiz/travellers-apps/issues/127
[#128]: https://github.com/muhammedgaygisiz/travellers-apps/issues/128
[#129]: https://github.com/muhammedgaygisiz/travellers-apps/issues/129
[#132]: https://github.com/muhammedgaygisiz/travellers-apps/issues/132
[#134]: https://github.com/muhammedgaygisiz/travellers-apps/issues/134
[#135]: https://github.com/muhammedgaygisiz/travellers-apps/issues/135
[#136]: https://github.com/muhammedgaygisiz/travellers-apps/issues/136
[#137]: https://github.com/muhammedgaygisiz/travellers-apps/issues/137
[#139]: https://github.com/muhammedgaygisiz/travellers-apps/issues/139
[#142]: https://github.com/muhammedgaygisiz/travellers-apps/issues/142
[#146]: https://github.com/muhammedgaygisiz/travellers-apps/issues/146
[#148]: https://github.com/muhammedgaygisiz/travellers-apps/issues/148
[#150]: https://github.com/muhammedgaygisiz/travellers-apps/issues/150
[#154]: https://github.com/muhammedgaygisiz/travellers-apps/issues/154
[#156]: https://github.com/muhammedgaygisiz/travellers-apps/issues/156
[#159]: https://github.com/muhammedgaygisiz/travellers-apps/issues/159
[#160]: https://github.com/muhammedgaygisiz/travellers-apps/issues/160
[#161]: https://github.com/muhammedgaygisiz/travellers-apps/issues/161
[#162]: https://github.com/muhammedgaygisiz/travellers-apps/issues/162
[#163]: https://github.com/muhammedgaygisiz/travellers-apps/issues/163
[#165]: https://github.com/muhammedgaygisiz/travellers-apps/issues/165
[#166]: https://github.com/muhammedgaygisiz/travellers-apps/issues/166
[#167]: https://github.com/muhammedgaygisiz/travellers-apps/issues/167
[#170]: https://github.com/muhammedgaygisiz/travellers-apps/issues/170
[#173]: https://github.com/muhammedgaygisiz/travellers-apps/issues/173
[#174]: https://github.com/muhammedgaygisiz/travellers-apps/issues/174
[#176]: https://github.com/muhammedgaygisiz/travellers-apps/issues/176
[#178]: https://github.com/muhammedgaygisiz/travellers-apps/issues/178
[#180]: https://github.com/muhammedgaygisiz/travellers-apps/issues/180
[#181]: https://github.com/muhammedgaygisiz/travellers-apps/issues/181
[#182]: https://github.com/muhammedgaygisiz/travellers-apps/issues/182
[#183]: https://github.com/muhammedgaygisiz/travellers-apps/issues/183
[#185]: https://github.com/muhammedgaygisiz/travellers-apps/issues/185
[#188]: https://github.com/muhammedgaygisiz/travellers-apps/issues/188
[#189]: https://github.com/muhammedgaygisiz/travellers-apps/issues/189
[#191]: https://github.com/muhammedgaygisiz/travellers-apps/issues/191
[#193]: https://github.com/muhammedgaygisiz/travellers-apps/issues/193
[#195]: https://github.com/muhammedgaygisiz/travellers-apps/issues/195
[#197]: https://github.com/muhammedgaygisiz/travellers-apps/issues/197
[#201]: https://github.com/muhammedgaygisiz/travellers-apps/issues/201
[#202]: https://github.com/muhammedgaygisiz/travellers-apps/issues/202
[#205]: https://github.com/muhammedgaygisiz/travellers-apps/issues/205
[#206]: https://github.com/muhammedgaygisiz/travellers-apps/issues/206
[#207]: https://github.com/muhammedgaygisiz/travellers-apps/issues/207
[#208]: https://github.com/muhammedgaygisiz/travellers-apps/issues/208
[#210]: https://github.com/muhammedgaygisiz/travellers-apps/issues/210
[#211]: https://github.com/muhammedgaygisiz/travellers-apps/issues/211
[#212]: https://github.com/muhammedgaygisiz/travellers-apps/issues/212
[#213]: https://github.com/muhammedgaygisiz/travellers-apps/issues/213
[#214]: https://github.com/muhammedgaygisiz/travellers-apps/issues/214
[#216]: https://github.com/muhammedgaygisiz/travellers-apps/issues/216
[#217]: https://github.com/muhammedgaygisiz/travellers-apps/issues/217
[#218]: https://github.com/muhammedgaygisiz/travellers-apps/issues/218
[#219]: https://github.com/muhammedgaygisiz/travellers-apps/issues/219
[#220]: https://github.com/muhammedgaygisiz/travellers-apps/issues/220
[#221]: https://github.com/muhammedgaygisiz/travellers-apps/issues/221
[#222]: https://github.com/muhammedgaygisiz/travellers-apps/issues/222
[#223]: https://github.com/muhammedgaygisiz/travellers-apps/issues/223
[#224]: https://github.com/muhammedgaygisiz/travellers-apps/issues/224
[#225]: https://github.com/muhammedgaygisiz/travellers-apps/issues/225
[#226]: https://github.com/muhammedgaygisiz/travellers-apps/issues/226
[#227]: https://github.com/muhammedgaygisiz/travellers-apps/issues/227
[#228]: https://github.com/muhammedgaygisiz/travellers-apps/issues/228
[#229]: https://github.com/muhammedgaygisiz/travellers-apps/issues/229
[#230]: https://github.com/muhammedgaygisiz/travellers-apps/issues/230
[#231]: https://github.com/muhammedgaygisiz/travellers-apps/issues/231
[#232]: https://github.com/muhammedgaygisiz/travellers-apps/issues/232
[#233]: https://github.com/muhammedgaygisiz/travellers-apps/issues/233
[#234]: https://github.com/muhammedgaygisiz/travellers-apps/issues/234
[#235]: https://github.com/muhammedgaygisiz/travellers-apps/issues/235
[#236]: https://github.com/muhammedgaygisiz/travellers-apps/issues/236
[#237]: https://github.com/muhammedgaygisiz/travellers-apps/issues/237
[#238]: https://github.com/muhammedgaygisiz/travellers-apps/issues/238
[#239]: https://github.com/muhammedgaygisiz/travellers-apps/issues/239
[#240]: https://github.com/muhammedgaygisiz/travellers-apps/issues/240
[#241]: https://github.com/muhammedgaygisiz/travellers-apps/issues/241
[#242]: https://github.com/muhammedgaygisiz/travellers-apps/issues/242
[#243]: https://github.com/muhammedgaygisiz/travellers-apps/issues/243
[#244]: https://github.com/muhammedgaygisiz/travellers-apps/issues/244
[#245]: https://github.com/muhammedgaygisiz/travellers-apps/issues/245
[#246]: https://github.com/muhammedgaygisiz/travellers-apps/issues/246
[#247]: https://github.com/muhammedgaygisiz/travellers-apps/issues/247
[#248]: https://github.com/muhammedgaygisiz/travellers-apps/issues/248
[#249]: https://github.com/muhammedgaygisiz/travellers-apps/issues/249
[#250]: https://github.com/muhammedgaygisiz/travellers-apps/issues/250
[#251]: https://github.com/muhammedgaygisiz/travellers-apps/issues/251
[#252]: https://github.com/muhammedgaygisiz/travellers-apps/issues/252
[#255]: https://github.com/muhammedgaygisiz/travellers-apps/issues/255
[#271]: https://github.com/muhammedgaygisiz/travellers-apps/issues/271
[#272]: https://github.com/muhammedgaygisiz/travellers-apps/issues/272
[#275]: https://github.com/muhammedgaygisiz/travellers-apps/issues/275
[#277]: https://github.com/muhammedgaygisiz/travellers-apps/issues/277
[#279]: https://github.com/muhammedgaygisiz/travellers-apps/issues/279
[#280]: https://github.com/muhammedgaygisiz/travellers-apps/issues/280
[#282]: https://github.com/muhammedgaygisiz/travellers-apps/issues/282
[#283]: https://github.com/muhammedgaygisiz/travellers-apps/issues/283
[#284]: https://github.com/muhammedgaygisiz/travellers-apps/issues/284
[#285]: https://github.com/muhammedgaygisiz/travellers-apps/issues/285
[#289]: https://github.com/muhammedgaygisiz/travellers-apps/issues/289
[#290]: https://github.com/muhammedgaygisiz/travellers-apps/issues/290
[#291]: https://github.com/muhammedgaygisiz/travellers-apps/issues/291
[#292]: https://github.com/muhammedgaygisiz/travellers-apps/issues/292
[#293]: https://github.com/muhammedgaygisiz/travellers-apps/issues/293
[#295]: https://github.com/muhammedgaygisiz/travellers-apps/issues/295
[#298]: https://github.com/muhammedgaygisiz/travellers-apps/issues/298
[#299]: https://github.com/muhammedgaygisiz/travellers-apps/issues/299
[#300]: https://github.com/muhammedgaygisiz/travellers-apps/issues/300
[#301]: https://github.com/muhammedgaygisiz/travellers-apps/issues/301
[#303]: https://github.com/muhammedgaygisiz/travellers-apps/issues/303
[#304]: https://github.com/muhammedgaygisiz/travellers-apps/issues/304
[#305]: https://github.com/muhammedgaygisiz/travellers-apps/issues/305
[#306]: https://github.com/muhammedgaygisiz/travellers-apps/issues/306
[#307]: https://github.com/muhammedgaygisiz/travellers-apps/issues/307
[#311]: https://github.com/muhammedgaygisiz/travellers-apps/issues/311
[#312]: https://github.com/muhammedgaygisiz/travellers-apps/issues/312
[#314]: https://github.com/muhammedgaygisiz/travellers-apps/issues/314
[#317]: https://github.com/muhammedgaygisiz/travellers-apps/issues/317
[#321]: https://github.com/muhammedgaygisiz/travellers-apps/issues/321
[#323]: https://github.com/muhammedgaygisiz/travellers-apps/issues/323
[#337]: https://github.com/muhammedgaygisiz/travellers-apps/issues/337
[#338]: https://github.com/muhammedgaygisiz/travellers-apps/issues/338
[#346]: https://github.com/muhammedgaygisiz/travellers-apps/issues/346
[#347]: https://github.com/muhammedgaygisiz/travellers-apps/issues/347
[#349]: https://github.com/muhammedgaygisiz/travellers-apps/issues/349
[#350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/350
[#351]: https://github.com/muhammedgaygisiz/travellers-apps/issues/351
[#352]: https://github.com/muhammedgaygisiz/travellers-apps/issues/352
[#353]: https://github.com/muhammedgaygisiz/travellers-apps/issues/353
[#354]: https://github.com/muhammedgaygisiz/travellers-apps/issues/354
[#355]: https://github.com/muhammedgaygisiz/travellers-apps/issues/355
[#356]: https://github.com/muhammedgaygisiz/travellers-apps/issues/356
[#357]: https://github.com/muhammedgaygisiz/travellers-apps/issues/357
[#358]: https://github.com/muhammedgaygisiz/travellers-apps/issues/358
[#359]: https://github.com/muhammedgaygisiz/travellers-apps/issues/359
[#361]: https://github.com/muhammedgaygisiz/travellers-apps/issues/361
[#362]: https://github.com/muhammedgaygisiz/travellers-apps/issues/362
[#365]: https://github.com/muhammedgaygisiz/travellers-apps/issues/365
[#375]: https://github.com/muhammedgaygisiz/travellers-apps/issues/375
[#376]: https://github.com/muhammedgaygisiz/travellers-apps/issues/376
[#377]: https://github.com/muhammedgaygisiz/travellers-apps/issues/377
[#379]: https://github.com/muhammedgaygisiz/travellers-apps/issues/379
[#380]: https://github.com/muhammedgaygisiz/travellers-apps/issues/380
[#381]: https://github.com/muhammedgaygisiz/travellers-apps/issues/381
[#384]: https://github.com/muhammedgaygisiz/travellers-apps/issues/384
[#386]: https://github.com/muhammedgaygisiz/travellers-apps/issues/386
[#387]: https://github.com/muhammedgaygisiz/travellers-apps/issues/387
[#389]: https://github.com/muhammedgaygisiz/travellers-apps/issues/389
[#391]: https://github.com/muhammedgaygisiz/travellers-apps/issues/391
[#392]: https://github.com/muhammedgaygisiz/travellers-apps/issues/392
[#395]: https://github.com/muhammedgaygisiz/travellers-apps/issues/395
[#413]: https://github.com/muhammedgaygisiz/travellers-apps/issues/413
[#415]: https://github.com/muhammedgaygisiz/travellers-apps/issues/415
[#417]: https://github.com/muhammedgaygisiz/travellers-apps/issues/417
[#418]: https://github.com/muhammedgaygisiz/travellers-apps/issues/418
[#419]: https://github.com/muhammedgaygisiz/travellers-apps/issues/419
