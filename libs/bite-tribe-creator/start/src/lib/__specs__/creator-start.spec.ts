import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { CreatorStart } from '../creator-start';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe(CreatorStart.name, () => {
  let fixture: ComponentFixture<CreatorStart>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    })
      .overrideComponent(CreatorStart, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CreatorStart);
    fixture.detectChanges();
  });

  // `AUTH_ROUTES` registers both under these literals. Any account may create
  // a BiteTrail, so the page offers Sign Up as well as Log In (issue #2130).
  it('links to the shared login and registration routes', () => {
    const links = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((el) => el.injector.get(RouterLink).urlTree?.toString());

    expect(links).toEqual(['/login', '/registration']);
  });
});
