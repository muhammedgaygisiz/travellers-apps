import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminStart } from '../admin-start';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe(AdminStart.name, () => {
  let component: AdminStart;
  let fixture: ComponentFixture<AdminStart>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    })
      .overrideComponent(AdminStart, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AdminStart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // `AUTH_ROUTES` registers the login under this literal, and
  // `AuthService.logout()` navigates to the same one. A second spelling here
  // would route to nothing.
  it('links to the shared login route', () => {
    const link = fixture.debugElement
      .query(By.directive(RouterLink))
      .injector.get(RouterLink);

    expect(component.loginPath).toBe('/login');
    expect(link.urlTree?.toString()).toBe('/login');
  });
});
