import { AuthContainerComponent } from '../integration/auth-container.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthModule } from '../auth.module';
import { provideMockStore } from '@ngrx/store/testing';
import { AuthService } from '../integration/auth.service';

describe('AuthContainerComponent', () => {
  let component: AuthContainerComponent;
  let fixture: ComponentFixture<AuthContainerComponent>;

  const loginWithGoogleAccountMock = jest.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthModule],
      providers: [
        provideMockStore({}),
        {
          provide: AuthService,
          useValue: {
            loginWithGoogleAccount: loginWithGoogleAccountMock,
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when onSignupWithGoogle is called', () => {
    it('should call loginWithGoogleAccount in auth service', function () {
      component.onSignupWithGoogle();

      expect(loginWithGoogleAccountMock).toBeCalledTimes(1);
    });
  });
});
