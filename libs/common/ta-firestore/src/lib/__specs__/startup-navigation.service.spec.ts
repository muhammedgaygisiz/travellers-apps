import { StartupNavigationService } from '../startup-navigation.service';

describe(StartupNavigationService.name, () => {
  let service: StartupNavigationService;

  beforeEach(() => {
    service = new StartupNavigationService();
  });

  it('has not settled before the startup gate releases navigation', () => {
    expect(service.hasSettled()).toBe(false);
  });

  it('keeps a waiter pending while startup navigation is still running', async () => {
    // A deep target that resolves here too early is exactly what the startup
    // navigation would overwrite (issue #1244).
    const settled = jest.fn();
    void service.whenSettled().then(settled);

    await Promise.resolve();

    expect(settled).not.toHaveBeenCalled();
  });

  it('releases waiters once startup navigation has settled', async () => {
    const settled = jest.fn();
    void service.whenSettled().then(settled);

    service.markSettled();
    await Promise.resolve();

    expect(service.hasSettled()).toBe(true);
    expect(settled).toHaveBeenCalled();
  });

  it('resolves a waiter that arrives after settling', async () => {
    // A notification tapped while the app was already open must not wait for a
    // startup navigation that is long past.
    service.markSettled();

    await expect(service.whenSettled()).resolves.toBeUndefined();
  });

  it('stays settled when the startup gate is re-entered', async () => {
    service.markSettled();
    service.markSettled();

    expect(service.hasSettled()).toBe(true);
    await expect(service.whenSettled()).resolves.toBeUndefined();
  });
});
