import { TestBed } from '@angular/core/testing';
import { RequestedUrlService } from '../requested-url.service';

describe(RequestedUrlService.name, () => {
  let service: RequestedUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestedUrlService);
  });

  it('has nothing to return by default', () => {
    expect(service.consume()).toBeUndefined();
  });

  it('hands back a remembered URL exactly once', () => {
    service.remember('/bite/shared-123');

    expect(service.consume()).toBe('/bite/shared-123');
    expect(service.consume()).toBeUndefined();
  });

  it('keeps the query string of the requested URL', () => {
    service.remember('/bite/shared-123?from=share');

    expect(service.consume()).toBe('/bite/shared-123?from=share');
  });

  it('ignores sign-in pages, which would return the visitor to the start', () => {
    service.remember('/login');

    expect(service.consume()).toBeUndefined();
  });

  it('replaces an older request with the newer one', () => {
    service.remember('/bite/first');
    service.remember('/bite/second');

    expect(service.consume()).toBe('/bite/second');
  });
});
