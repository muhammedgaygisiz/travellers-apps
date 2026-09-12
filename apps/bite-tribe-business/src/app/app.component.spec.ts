import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Network } from '@capacitor/network';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { NetworkStatusService } from 'common/networkstatus';

// Replaced outright rather than spied on: the Capacitor plugin proxies its
// calls to a bridge that does not exist in a Node test.
jest.mock('@capacitor/network', () => ({
  Network: {
    addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
    removeAllListeners: jest.fn(() => Promise.resolve()),
    getStatus: jest.fn(() =>
      Promise.resolve({ connected: true, connectionType: 'wifi' }),
    ),
  },
}));

const addListener = Network.addListener as unknown as jest.Mock;

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.debugElement.componentInstance;
  });

  afterEach(() => jest.clearAllMocks());

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  it('should not block the App Check gate by default', () => {
    expect(component.appCheckReadiness.isBlocked()).toBe(false);
  });

  it('should reflect the blocked state from the readiness service', () => {
    component.appCheckReadiness.markBlocked();

    expect(component.appCheckReadiness.isBlocked()).toBe(true);
  });

  /**
   * Until issue #1096 only the consumer app registered this, so
   * `NetworkStatusService` answered "connected" in the business app for the
   * whole of a session whatever the wifi did - and the staff table view
   * decides whether to send a transition or write it down off that answer.
   */
  describe('network status', () => {
    it('should feed connectivity changes into the shared service', () => {
      const status = TestBed.inject(NetworkStatusService);

      expect(addListener).toHaveBeenCalledWith(
        'networkStatusChange',
        expect.any(Function),
      );

      addListener.mock.calls[0][1]({
        connected: false,
        connectionType: 'none',
      });

      expect(status.status()?.connected).toBe(false);
    });
  });
});
