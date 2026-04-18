import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailBitesPage } from '../bite-trail-bites.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(BiteTrailBitesPage.name, () => {
  let component: BiteTrailBitesPage;
  let fixture: ComponentFixture<BiteTrailBitesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailBitesPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrailBitesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
