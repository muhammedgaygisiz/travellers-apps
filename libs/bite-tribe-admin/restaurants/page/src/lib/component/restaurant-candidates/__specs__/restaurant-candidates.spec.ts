import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminRestaurantCandidate } from 'bite-tribe-admin/restaurants-data-access';
import { RestaurantCandidates } from '../restaurant-candidates';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

/**
 * These assertions came with the surface: they used to cover the candidate card
 * on the business dashboard, which moved here with issue #1473 rather than
 * being dropped.
 */
describe(RestaurantCandidates.name, () => {
  let component: RestaurantCandidates;
  let fixture: ComponentFixture<RestaurantCandidates>;
  let compRef: ComponentRef<RestaurantCandidates>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    })
      .overrideComponent(RestaurantCandidates, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RestaurantCandidates);
    compRef = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render restaurant candidates with review context', () => {
    const candidate = {
      id: 'candidate-1',
      name: 'Pizza Palace',
      position: { latitude: 46.948, longitude: 7.4474 },
      biteIds: ['bite-1', 'bite-2'],
      evidence: { biteCount: 2, placeNames: { 'Pizza Palace': 2 } },
      bites: [
        { id: 'bite-1', name: 'Margherita', place: 'Pizza Palace' },
        { id: 'bite-2', name: 'Calzone', place: 'Pizza Palace' },
      ],
    } as AdminRestaurantCandidate;

    compRef.setInput('candidates', [candidate]);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('restaurant-candidates');
    expect(textContent).toContain('Pizza Palace');
    expect(textContent).toContain('candidate-evidence-count');
    expect(textContent).toContain('Margherita, Calzone');
    expect(textContent).toContain('46.948, 7.4474');
  });

  it('should render candidates that lack evidence, names and position', () => {
    const sparseCandidate = {
      id: 'candidate-2',
      name: 'Nameless Spot',
      bites: [{ id: 'bite-3', name: '', place: '' }],
    } as AdminRestaurantCandidate;

    compRef.setInput('candidates', [sparseCandidate]);
    fixture.detectChanges();

    expect(component.evidenceCount(sparseCandidate)).toBe(0);
    expect(component.biteEvidence(sparseCandidate)).toBe('');
    expect(component.candidateLocation(sparseCandidate)).toBe('');
  });

  it('should emit the selected candidate', () => {
    const candidate = {
      id: 'candidate-1',
      name: 'Pizza Palace',
      position: { latitude: 46.948, longitude: 7.4474 },
      biteIds: [],
      bites: [],
    } as AdminRestaurantCandidate;
    const emitSpy = jest.spyOn(component.candidateClick, 'emit');

    compRef.setInput('candidates', [candidate]);
    fixture.detectChanges();
    fixture.nativeElement
      .querySelectorAll('ion-item')[0]
      .dispatchEvent(new Event('click'));

    expect(emitSpy).toHaveBeenCalledWith(candidate);
  });
});
