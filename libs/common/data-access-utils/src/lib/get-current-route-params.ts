import { ActivatedRoute } from '@angular/router';

export const getCurrentRouteParams = (activatedRoute: ActivatedRoute) => {
  let currentRoute = activatedRoute;
  while (currentRoute?.firstChild) {
    currentRoute = currentRoute?.firstChild;
  }

  return currentRoute.paramMap;
};
