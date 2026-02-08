import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, startGuard } from 'ta-firestore';
import { biteTitleResolver } from 'bite-tribe/store';
import { PATH } from 'utils';

export const ROUTES: Routes = withAuthRoutes([
  {
    path: PATH.START,
    loadComponent: () =>
      import('bite-tribe/start').then((m) => m.StartComponent),
    title: 'Welcome',
    canActivate: [startGuard],
  },
  {
    path: PATH.HOME,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.HomeContainerComponent),
    canActivate: [authGuard],
    title: 'Bites',
  },
  {
    path: `${PATH.HOME}/map-view`,
    loadComponent: () =>
      import('bite-tribe/map').then((m) => m.HomeMapContainerComponent),
    canActivate: [authGuard],
    title: 'Bites',
  },
  {
    path: PATH.NEW_BITE,
    loadComponent: () => import('bite-tribe/bite').then((m) => m.BiteContainer),
    canActivate: [authGuard],
    title: 'New',
  },
  {
    path: `${PATH.BITE}/:biteId`,
    loadComponent: () =>
      import('bite-tribe/details').then((m) => m.DetailsContainer),
    title: biteTitleResolver,
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/edit`,
    loadComponent: () =>
      import('bite-tribe/bite').then((m) => m.EditBiteContainer),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/:restaurantId`,
    loadComponent: () =>
      import('bite-tribe/restaurant').then((m) => m.RestaurantContainer),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/:restaurantId/${PATH.MENU}/:menuId`,
    loadComponent: () => import('bite-tribe/menu').then((m) => m.MenuContainer),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('bite-tribe/settings').then((m) => m.SettingsContainer),
    canActivate: [authGuard],
  },
  {
    path: PATH.MY_BITES,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.MyBitesContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BITES}/map-view`,
    loadComponent: () =>
      import('bite-tribe/map').then((m) => m.MyBitesMapContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: PATH.MY_BUCKETLISTS,
    loadComponent: () =>
      import('bite-tribe/bucketlist').then(
        (m) => m.BucketlistsContainerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BUCKETLISTS}/:bucketlistId`,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.BucketlistContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BUCKETLISTS}/:bucketlistId/map-view`,
    loadComponent: () =>
      import('bite-tribe/map').then((m) => m.BucketListMapContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.PROFILE}/:userId`,
    loadComponent: () =>
      import('bite-tribe/profile').then((m) => m.ProfileContainer),
  },
  {
    path: PATH.MY_PROFILE,
    loadComponent: () =>
      import('bite-tribe/profile').then((m) => m.MyProfileContainer),
  },
  {
    path: PATH.EDIT_PROFILE,
    loadComponent: () =>
      import('bite-tribe/profile').then((m) => m.EditProfileContainer),
  },
  {
    path: `${PATH.FOLLOWERS}/:userId/:type`,
    loadComponent: () =>
      import('bite-tribe/followers').then((m) => m.FollowersContainer),
    canActivate: [authGuard],
  },
  {
    path: PATH.ABOUT,
    loadComponent: () =>
      import('bite-tribe/about').then((m) => m.AboutContainerComponent),
  },
  {
    path: PATH.PRIVACY_POLICY,
    loadComponent: () =>
      import('bite-tribe/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
