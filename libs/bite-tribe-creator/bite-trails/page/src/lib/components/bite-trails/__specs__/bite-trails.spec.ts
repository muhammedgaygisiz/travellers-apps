import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { BiteTrail } from 'model';
import { BiteTrailsComponent } from '../bite-trails';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const trail = (over: Partial<BiteTrail>): BiteTrail =>
  ({
    id: 'trail-1',
    ownerId: 'owner-1',
    name: 'Munich Trail',
    biteIds: [],
    imagePath: '',
    ...over,
  }) as BiteTrail;

/** GitHub issue #2141: the owner sees where a trail's photo stands. */
describe(BiteTrailsComponent.name, () => {
  let fixture: ComponentFixture<BiteTrailsComponent>;

  const byTestId = (id: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  const render = (biteTrails: BiteTrail[]): void => {
    fixture.componentRef.setInput('biteTrails', biteTrails);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] })
      .overrideComponent(BiteTrailsComponent, {
        remove: { imports: [PageComponent, TranslocoPipe] },
        add: {
          imports: [MockTranslocoPipe],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BiteTrailsComponent);
  });

  it('shows nothing of a published photo or a trail without one', () => {
    render([trail({ imageStatus: 'uploaded' }), trail({ id: 'trail-2' })]);

    expect(byTestId('bite-trails-list')?.textContent).toContain('Munich Trail');
    expect(byTestId('bite-trail-photo-pending')).toBeNull();
    expect(byTestId('bite-trail-photo-refused')).toBeNull();
    expect(byTestId('bite-trail-photo-failed')).toBeNull();
  });

  it('says a photo is being checked', () => {
    render([trail({ imageStatus: 'pending' })]);

    expect(byTestId('bite-trail-photo-pending')?.textContent).toContain(
      'bite-trail-photo-checking',
    );
  });

  it('says an upload failed', () => {
    render([trail({ imageStatus: 'failed' })]);

    expect(byTestId('bite-trail-photo-failed')?.textContent).toContain(
      'image-upload-failed',
    );
  });

  it('says why a photo was refused', () => {
    render([
      trail({ imageStatus: 'refused', imageRefusalCategory: 'self_harm' }),
    ]);

    const refused = byTestId('bite-trail-photo-refused')?.textContent;
    expect(refused).toContain('photo-refused');
    expect(refused).toContain('photo-refused-reason-self_harm');
  });

  it('says when there are no trails', () => {
    render([]);

    expect(fixture.nativeElement.textContent).toContain('no-bite-trails-found');
  });
});
