import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailBitesPage } from '../bite-trail-bites.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

jest.mock('localization');

describe(BiteTrailBitesPage.name, () => {
  let component: BiteTrailBitesPage;
  let fixture: ComponentFixture<BiteTrailBitesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailBitesPage],
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrailBitesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sortingLabel', () => {
    it('should return Distance for distance', () => {
      fixture.componentRef.setInput('sorting', 'distance');
      expect(component.sortingLabel()).toBe('Distance');
    });

    it('should return Likes for likes', () => {
      fixture.componentRef.setInput('sorting', 'likes');
      expect(component.sortingLabel()).toBe('Likes');
    });

    it('should return Date for createdAt', () => {
      fixture.componentRef.setInput('sorting', 'createdAt');
      expect(component.sortingLabel()).toBe('Date');
    });

    it('should return Price for price', () => {
      fixture.componentRef.setInput('sorting', 'price');
      expect(component.sortingLabel()).toBe('Price');
    });

    it('should return Rating for rating', () => {
      fixture.componentRef.setInput('sorting', 'rating');
      expect(component.sortingLabel()).toBe('Rating');
    });

    it('should return Distance as default for unknown sorting', () => {
      fixture.componentRef.setInput('sorting', 'unknown');
      expect(component.sortingLabel()).toBe('Distance');
    });
  });

  describe('emitSortingChange', () => {
    it('should emit sortingChange with the new value', () => {
      const sortingChangeSpy = jest.spyOn(component.sortingChange, 'emit');
      component.emitSortingChange({ detail: { value: 'likes' } });
      expect(sortingChangeSpy).toHaveBeenCalledWith('likes');
    });
  });
});
