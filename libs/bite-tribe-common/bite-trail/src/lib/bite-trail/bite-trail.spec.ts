import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailComponent } from './bite-trail';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BiteTrail', () => {
  let component: BiteTrailComponent;
  let fixture: ComponentFixture<BiteTrailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
