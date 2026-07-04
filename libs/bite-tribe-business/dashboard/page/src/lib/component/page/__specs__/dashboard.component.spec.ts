import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { DashboardComponent } from '../dashboard.component';
import { DashboardRestaurantCandidate } from 'bite-tribe-business/dashboard-data-access';

@Pipe({
  name: 'transloco',
})
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

describe(DashboardComponent.name, () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let compRef: ComponentRef<DashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    })
      .overrideComponent(DashboardComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
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
    } as DashboardRestaurantCandidate;

    compRef.setInput('restaurantCandidates', [candidate]);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('restaurant-candidates');
    expect(textContent).toContain('Pizza Palace');
    expect(textContent).toContain('candidate-evidence-count');
    expect(textContent).toContain('Margherita, Calzone');
    expect(textContent).toContain('46.948, 7.4474');
  });

  it('should emit the selected candidate', () => {
    const candidate = {
      id: 'candidate-1',
      name: 'Pizza Palace',
      position: { latitude: 46.948, longitude: 7.4474 },
      biteIds: [],
      bites: [],
    } as DashboardRestaurantCandidate;
    const emitSpy = jest.spyOn(component.restaurantCandidateClick, 'emit');

    compRef.setInput('restaurantCandidates', [candidate]);
    fixture.detectChanges();
    fixture.nativeElement
      .querySelectorAll('ion-item')[0]
      .dispatchEvent(new Event('click'));

    expect(emitSpy).toHaveBeenCalledWith(candidate);
  });
});
