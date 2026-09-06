import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
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
  let user: ReturnType<typeof signal<{ email: string | null } | undefined>>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    logout = jest.fn();
    user = signal<{ email: string | null } | undefined>({
      email: 'ops@bitetribe.app',
    });

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: BiteTribeStoreService, useValue: { user, logout } },
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

  // Logout goes through the store, not `AuthService` directly, so it runs the
  // same teardown effects the other two apps do.
  it('logs out through the store', () => {
    createComponent();

    component.logout();

    expect(logout).toHaveBeenCalled();
  });
});
