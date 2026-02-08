import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacyPolicy } from '../privacy-policy';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

jest.mock('localization');

describe('PrivacyPolicy', () => {
  let component: PrivacyPolicy;
  let fixture: ComponentFixture<PrivacyPolicy>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicy);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('year', () => {
    describe('given year 2026', () => {
      it('should return 2026', () => {
        const mockDate = new Date('2026-01-01T00:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        expect(component.year).toBe('2026');
      });
    });
  });

  describe('contactClicked', () => {
    it('should set isContactClicked to true', () => {
      expect(component.isContactClicked()).toBe(false);

      component.contactClicked();

      expect(component.isContactClicked()).toBe(true);
    });
  });
});
