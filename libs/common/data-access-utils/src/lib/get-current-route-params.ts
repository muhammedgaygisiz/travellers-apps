import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable } from 'rxjs';

export const getCurrentRouteParams = (
  activatedRoute: ActivatedRoute
): Observable<ParamMap> => {
  let currentRoute = activatedRoute;
  while (currentRoute?.firstChild) {
    currentRoute = currentRoute?.firstChild;
  }

  return currentRoute.paramMap;
};
