import { Route, Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, freshSessionGuard, startGuard } from 'ta-firestore';
import { biteTitleResolver } from 'bite-tribe/store';
import {
  gateAuthenticatedRoutes,
  onboardingCompletedGuard,
} from 'bite-tribe/onboarding-guards';
import { OnboardingContainerComponent } from 'bite-tribe/onboarding';
import { PATH } from 'utils';

const APP_ROUTES: Routes = [
  {
    path: PATH.START,
    loadComponent: () =>
      import('bite-tribe/start').then((m) => m.StartComponent),
    title: 'Welcome',
    canActivate: [startGuard],
  },
  {
    path: PATH.HOME,
    loadComponent: () => import('bite-tribe/home').then((m) => m.HomeContainer),
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
    path: PATH.SEARCH,
    loadComponent: () =>
      import('bite-tribe/search').then((m) => m.SearchContainer),
    canActivate: [authGuard],
    title: 'Search',
  },
  {
    path: PATH.GALLERY,
    loadComponent: () =>
      import('bite-tribe/gallery').then((m) => m.GalleryContainer),
    canActivate: [authGuard],
    title: 'Gallery',
  },
  {
    path: PATH.LEADERBOARD,
    loadComponent: () =>
      import('bite-tribe/leaderboard').then((m) => m.LeaderboardContainer),
    canActivate: [authGuard],
    title: 'Leaderboard',
  },
  {
    path: PATH.WEEKLY_BITES,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.WeeklyBitesContainer),
    canActivate: [authGuard],
    title: 'Weekly Bites',
  },
  {
    path: PATH.NEW_BITE,
    loadComponent: () =>
      import('bite-tribe/bite').then((m) => m.CreateBiteContainer),
    canActivate: [authGuard, freshSessionGuard],
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
    title: biteTitleResolver,
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/:restaurantId`,
    loadComponent: () =>
      import('bite-tribe/restaurant').then((m) => m.RestaurantContainer),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/${PATH.PLACE}/:placeNameFromBite`,
    loadComponent: () =>
      import('bite-tribe/restaurant').then(
        (m) => m.UnverifiedRestaurantContainer,
      ),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/:restaurantId/${PATH.MENU}/:menuId`,
    loadComponent: () => import('bite-tribe/menu').then((m) => m.MenuContainer),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE}/:biteId/${PATH.RESTAURANT}/:restaurantId/${PATH.BITES}`,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.RestaurantBitesContainer),
    title: 'Restaurant Bites',
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('bite-tribe/settings').then((m) => m.SettingsContainer),
    title: 'Settings',
    canActivate: [authGuard],
  },
  {
    path: PATH.DELETE_ACCOUNT,
    loadComponent: () =>
      import('bite-tribe/delete-account').then(
        (m) => m.DeleteMyAccountContainer,
      ),
    title: 'Delete Account',
    canActivate: [authGuard],
  },
  {
    path: PATH.MY_BITES,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.MyBitesContainer),
    title: 'My Bites',
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BITES}/map-view`,
    loadComponent: () =>
      import('bite-tribe/map').then((m) => m.MyBitesMapContainerComponent),
    title: 'My Bites',
    canActivate: [authGuard],
  },
  {
    path: PATH.MY_BUCKETLISTS,
    loadComponent: () =>
      import('bite-tribe/bucketlist').then(
        (m) => m.BucketlistsContainerComponent,
      ),
    title: 'My Bucketlists',
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BUCKETLISTS}/:bucketlistId`,
    loadComponent: () =>
      import('bite-tribe/home').then((m) => m.BucketListContainer),
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BUCKETLISTS}/:bucketlistId/edit`,
    loadComponent: () =>
      import('bite-tribe/bucketlist').then(
        (m) => m.EditBucketlistsContainerComponent,
      ),
    title: 'Edit Bucket List',
    canActivate: [authGuard],
  },
  {
    path: `${PATH.MY_BUCKETLISTS}/:bucketlistId/rate`,
    loadComponent: () =>
      import('bite-tribe/bucketlist').then(
        (m) => m.RateBucketlistContainerComponent,
      ),
    title: 'Rate Bite Trail',
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
    canActivate: [authGuard],
  },
  {
    path: PATH.MY_PROFILE,
    loadComponent: () =>
      import('bite-tribe/profile').then((m) => m.MyProfileContainer),
    title: 'My Profile',
    canActivate: [authGuard],
  },
  {
    path: PATH.EDIT_PROFILE,
    loadComponent: () =>
      import('bite-tribe/profile').then((m) => m.EditProfileContainer),
    title: 'Edit Profile',
    canActivate: [authGuard],
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
    title: 'About',
    canActivate: [authGuard],
  },
  {
    path: PATH.MARKET_PLACE,
    loadComponent: () =>
      import('bite-tribe/market-place').then(
        (m) => m.MarketPlaceContainerComponent,
      ),
    title: 'Market Place',
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE_TRAIL}/:biteTrailId`,
    loadComponent: () =>
      import('bite-tribe/bite-trail').then(
        (m) => m.BiteTrailContainerComponent,
      ),
    title: 'Bite Trail',
    canActivate: [authGuard],
  },
  {
    path: `${PATH.BITE_TRAIL}/:biteTrailId/map-view`,
    loadComponent: () =>
      import('bite-tribe/map').then((m) => m.BiteTrailMapContainerComponent),
    canActivate: [authGuard],
  },
  {
    path: PATH.PRIVACY_POLICY,
    loadComponent: () =>
      import('bite-tribe/privacy-policy').then((m) => m.PrivacyPolicy),
    title: 'Privacy Policy',
  },
  {
    path: PATH.ACCOUNT_DELETION,
    loadComponent: () =>
      import('bite-tribe/delete-account').then((m) => m.DeleteAccount),
    title: 'Account Deletion',
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
];

// The entry-gate guards must be imported statically (like every other route
// guard), but the assistant itself is lazy: it pulls in the profile image
// upload chain (image compression, cropper, EXIF), which must not sit in the
// initial bundle for a flow each user sees once.
const ONBOARDING_ROUTE: Route = {
  path: PATH.ONBOARDING,
  component: OnboardingContainerComponent,
  title: 'Onboarding',
  canActivate: [authGuard, onboardingCompletedGuard],
};

export const ROUTES: Routes = withAuthRoutes([
  ...gateAuthenticatedRoutes(APP_ROUTES, authGuard),
  ONBOARDING_ROUTE,
]);
