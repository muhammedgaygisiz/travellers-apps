import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailComponent } from './bite-trail';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { BiteTrail } from 'model';

const trail: BiteTrail = {
  id: 'trail1',
  ownerId: 'owner1',
  name: 'Vienna Schnitzel Trail',
  biteIds: ['bite1'],
  imagePath: 'trail.jpg',
  ownerImagePath: 'owner.jpg',
  ownerName: 'chiyoko',
  location: 'Vienna',
  description: 'Five schnitzels',
  price: 0,
  currency: 'EUR',
};

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
    fixture.componentRef.setInput('biteTrail', trail);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('opening the BiteTrail from the card (issue #1765)', () => {
    let opened: BiteTrail[];
    let profiles: string[];

    const query = (selector: string): HTMLElement =>
      fixture.nativeElement.querySelector(selector) as HTMLElement;

    const click = (selector: string): void =>
      query(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    beforeEach(() => {
      opened = [];
      profiles = [];
      component.viewBiteTrail.subscribe((value) => opened.push(value));
      component.goToProfile.subscribe((id) => profiles.push(id));
    });

    it('makes the whole card one pressable, focusable button', () => {
      const card = query('ion-card');

      expect(card.hasAttribute('btpressable')).toBe(true);
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
    });

    it.each([
      ['the photo', '.card-image img'],
      ['the title', 'ion-card-title'],
      ['the card surface', 'ion-card'],
    ])('opens the BiteTrail from %s', (_, selector) => {
      click(selector);

      expect(opened).toEqual([trail]);
    });

    it('opens the owner profile from the owner name, and not the BiteTrail', () => {
      click('[data-testid="bite-trail-owner"]');

      expect(profiles).toEqual(['owner1']);
      expect(opened).toEqual([]);
    });

    it('gives the owner name its own press', () => {
      expect(
        query('[data-testid="bite-trail-owner"]').hasAttribute('btpressable'),
      ).toBe(true);
    });

    it('opens the BiteTrail once from View BiteTrail', () => {
      click('[data-testid="bite-trail-view"]');

      expect(opened).toEqual([trail]);
    });

    it('leaves Enter on the owner name to the owner name', () => {
      query('[data-testid="bite-trail-owner"]').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      expect(opened).toEqual([]);
    });

    it('opens the BiteTrail on Enter while the card itself has focus', () => {
      query('ion-card').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      expect(opened).toEqual([trail]);
    });
  });
});
