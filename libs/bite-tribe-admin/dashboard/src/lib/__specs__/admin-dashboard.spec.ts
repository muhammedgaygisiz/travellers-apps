import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from 'ta-firestore';
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
  let getUser: jest.Mock;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    getUser = jest.fn(() => ({
      uid: 'operator-1',
      email: 'ops@bitetribe.app',
    }));

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: AuthService, useValue: { getUser } },
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
    getUser.mockReturnValue(undefined);

    createComponent();

    expect(component.email()).toBeUndefined();
    expect(
      fixture.nativeElement.querySelector('.admin-dashboard__account'),
    ).toBeNull();
  });

  it('treats a provider account with no email as having none', () => {
    getUser.mockReturnValue({ uid: 'operator-1', email: null });

    createComponent();

    expect(component.email()).toBeUndefined();
  });
});
