import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { NoAccessComponent } from '../no-access/no-access.component';
import { AuthService } from '../auth.service';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

describe(NoAccessComponent.name, () => {
  let fixture: ComponentFixture<NoAccessComponent>;
  let component: NoAccessComponent;
  let logout: jest.Mock;
  let queryParamMap: BehaviorSubject<{ get: (key: string) => string | null }>;

  const withRoleParam = (role: string | null): void => {
    queryParamMap.next({ get: (key) => (key === 'role' ? role : null) });
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(NoAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    logout = jest.fn();
    queryParamMap = new BehaviorSubject<{
      get: (key: string) => string | null;
    }>({ get: (): null => null });

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: AuthService, useValue: { logout } },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
      ],
    })
      .overrideComponent(NoAccessComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();
  });

  it('names the role the account is missing', () => {
    withRoleParam('business');

    createComponent();

    expect(component.role()).toBe('business');
    expect(fixture.nativeElement.textContent).toContain(
      'no-access-message-role:{"role":"business"}',
    );
  });

  // The parameter comes out of the address bar, so it is user input.
  it.each([['superuser'], ['<script>alert(1)</script>'], ['Admin']])(
    'falls back to the generic message for the unrecognised role %p',
    (role) => {
      withRoleParam(role);

      createComponent();

      expect(component.role()).toBeUndefined();
      expect(fixture.nativeElement.textContent).toContain('no-access-message');
      expect(fixture.nativeElement.textContent).not.toContain(role);
    },
  );

  it('falls back to the generic message when no role is named', () => {
    createComponent();

    expect(component.role()).toBeUndefined();
  });

  // Signing out is the only action that helps: the account that needs access
  // is granted the role by an operator, and another account is reached by
  // signing in as it.
  it('offers signing out', () => {
    createComponent();

    fixture.nativeElement.querySelector('ion-button').click();

    expect(logout).toHaveBeenCalled();
  });
});
