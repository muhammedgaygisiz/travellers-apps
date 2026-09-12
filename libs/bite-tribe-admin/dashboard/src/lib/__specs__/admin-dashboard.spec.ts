import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AdminDashboard } from '../admin-dashboard';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe(AdminDashboard.name, () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let logout: jest.Mock;
  let navigateByUrl: jest.Mock;
  let user: ReturnType<typeof signal<{ email: string | null } | undefined>>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    logout = jest.fn();
    navigateByUrl = jest.fn(() => Promise.resolve(true));
    user = signal<{ email: string | null } | undefined>({
      email: 'ops@bitetribe.app',
    });

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: BiteTribeStoreService, useValue: { user, logout } },
        { provide: Router, useValue: { navigateByUrl, config: [] } },
      ],
    })
      .overrideComponent(AdminDashboard, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();
  });

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  // An operator has to be able to tell which identity the tool is acting as
  // before it acts on anyone's restaurant.
  it('shows the signed-in account', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('ops@bitetribe.app');
  });

  it('renders without an account rather than showing an empty line', () => {
    user.set(undefined);

    createComponent();

    expect(component.email()).toBeUndefined();
    expect(
      fixture.nativeElement.querySelector('.admin-dashboard__account'),
    ).toBeNull();
  });

  it('treats a provider account with no email as having none', () => {
    user.set({ email: null });

    createComponent();

    expect(component.email()).toBeUndefined();
  });

  // User management is first because nothing else in the tool works until an
  // account has been granted a role.
  it('lists user management as the first operator surface', () => {
    createComponent();

    expect(component.tools[0]).toMatchObject({
      titleKey: 'admin-tool-user-management',
      path: '/user-management',
    });
  });

  // Each operational surface is its own entry rather than one "migrations"
  // page (issue #1473). Asserted as the whole list so a surface added later
  // without an entry — or an entry pointing at a route that does not exist —
  // shows up here.
  it('lists every operator surface', () => {
    createComponent();

    expect(component.tools.map((tool) => tool.path)).toEqual([
      '/user-management',
      '/bite-search',
      '/restaurant-candidates',
      '/restaurant-ownership',
      '/bite-places',
      '/new-version-notification',
      '/review-timestamps-backfill',
      '/menu-item-ids-backfill',
      '/bite-address-backfill',
      '/restaurant-clustering',
      '/image-migration',
      '/geohash-migration',
    ]);
  });

  it('renders an entry per tool', () => {
    createComponent();

    const items = fixture.nativeElement.querySelectorAll(
      '[data-testid="admin-tools"] ion-item',
    );

    expect(items).toHaveLength(component.tools.length);
  });

  it('routes to the tool that was clicked', () => {
    createComponent();

    component.open(component.tools[0]);

    expect(navigateByUrl).toHaveBeenCalledWith('/user-management');
  });

  // Logout goes through the store, not `AuthService` directly, so it runs the
  // same teardown effects the other two apps do.
  it('logs out through the store', () => {
    createComponent();

    component.logout();

    expect(logout).toHaveBeenCalled();
  });
});
