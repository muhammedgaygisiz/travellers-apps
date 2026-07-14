import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { ForgotPasswordService } from '../forgot-password.service';

const MockedAuthService = {
  sendPasswordResetEmail: jest.fn(),
};

const MockedAnalyticsService = {
  logEvent: jest.fn(),
};

const MockedNavController = {
  navigateBack: jest.fn(),
};

describe(ForgotPasswordService.name, () => {
  let service: ForgotPasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuthService.sendPasswordResetEmail.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: AnalyticsService, useValue: MockedAnalyticsService },
        { provide: NavController, useValue: MockedNavController },
      ],
    });

    service = TestBed.inject(ForgotPasswordService);
  });

  it('should request a password reset email and mark success', async () => {
    await service.requestPasswordReset('test@example.com');

    expect(MockedAuthService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(MockedAnalyticsService.logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.PasswordResetRequested,
    );
    expect(service.resetRequested()).toBe(true);
    expect(service.resetFailed()).toBe(false);
  });

  it('should log failure without email and mark failure', async () => {
    MockedAuthService.sendPasswordResetEmail.mockRejectedValue({
      code: 'auth/too-many-requests',
    });

    await service.requestPasswordReset('test@example.com');

    expect(MockedAnalyticsService.logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.PasswordResetRequestFailed,
      { code: 'auth/too-many-requests' },
    );
    expect(MockedAnalyticsService.logEvent).not.toHaveBeenCalledWith(
      AnalyticsEvent.PasswordResetRequestFailed,
      expect.objectContaining({ email: expect.anything() }),
    );
    expect(service.resetRequested()).toBe(false);
    expect(service.resetFailed()).toBe(true);
  });

  it('should use unknown failure code when no code is available', async () => {
    MockedAuthService.sendPasswordResetEmail.mockRejectedValue(
      new Error('offline'),
    );

    await service.requestPasswordReset('test@example.com');

    expect(MockedAnalyticsService.logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.PasswordResetRequestFailed,
      { code: 'unknown' },
    );
  });

  it('should navigate back to login', async () => {
    await service.backToLogin();

    expect(MockedNavController.navigateBack).toHaveBeenCalledWith(['/login']);
  });
});
