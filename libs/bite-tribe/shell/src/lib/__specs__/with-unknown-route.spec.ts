import { Routes } from '@angular/router';
import { withUnknownRoute } from '../with-unknown-route';

describe('withUnknownRoute', () => {
  const routes: Routes = [
    { path: 'home', redirectTo: 'start' },
    { path: 'login', redirectTo: 'start' },
  ];

  it('should send an unknown URL to the start page instead of failing the navigation', () => {
    expect(withUnknownRoute(routes).at(-1)).toEqual({
      path: '**',
      redirectTo: 'start',
    });
  });

  it('should keep every known route ahead of the wildcard', () => {
    expect(withUnknownRoute(routes).slice(0, -1)).toEqual(routes);
  });
});
