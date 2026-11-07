import { Component, input, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobeComponent } from 'bite-tribe-common/map/globe';
import { StoreLinksComponent } from 'bite-tribe/store-links';
import { getIonicConfig } from 'utils';
import { AboutPage } from '../about.page';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

// The real globe draws on a canvas jsdom does not have; only its inputs matter.
@Component({ selector: 'bt-globe', template: '' })
class GlobeStub {
  countryCodes = input<string[] | null | undefined>([]);
  autoSpin = input(true);
}

@Component({ selector: 'bt-store-links', template: '' })
class StoreLinksStub {
  surface = input<string>();
}

describe(AboutPage.name, () => {
  let fixture: ComponentFixture<AboutPage>;

  const globe = (): GlobeStub | undefined =>
    fixture.debugElement.query((el) => el.name === 'bt-globe')
      ?.componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    })
      .overrideComponent(AboutPage, {
        remove: {
          imports: [TranslocoPipe, GlobeComponent, StoreLinksComponent],
        },
        add: { imports: [MockTranslocoPipe, GlobeStub, StoreLinksStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AboutPage);
  });

  it('shows the globe with every country that has a Bite', () => {
    fixture.componentRef.setInput('biteCountryCodes', ['DE', 'TR']);
    fixture.detectChanges();

    expect(globe()?.countryCodes()).toEqual(['DE', 'TR']);
  });

  it.each([
    ['while the countries load or failed to', undefined],
    ['when no country has a Bite yet', []],
  ])('shows no globe %s', (_case, countryCodes) => {
    fixture.componentRef.setInput('biteCountryCodes', countryCodes);
    fixture.detectChanges();

    expect(globe()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain(
      'total-number-of-bites-on-bite-tribe',
    );
  });
});
