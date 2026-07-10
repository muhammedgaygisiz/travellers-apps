import { CountryFlags } from '../country-flags';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

describe(CountryFlags.name, () => {
  let component: CountryFlags;
  let fixture: ComponentFixture<CountryFlags>;
  let compRef: ComponentRef<CountryFlags>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CountryFlags);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  it('maps country codes to flag-icons css classes', () => {
    compRef.setInput('countryCodes', ['IT', 'de']);

    expect(component.flags()).toEqual([
      { countryCode: 'IT', cssClass: 'fi fi-it', name: 'Italy' },
      { countryCode: 'DE', cssClass: 'fi fi-de', name: 'Germany' },
    ]);
  });

  it('de-duplicates and ignores blank codes regardless of casing', () => {
    compRef.setInput('countryCodes', ['ch', 'CH', ' ', '']);

    expect(component.flags().map((flag) => flag.countryCode)).toEqual(['CH']);
  });

  it('returns an empty list when there are no country codes', () => {
    compRef.setInput('countryCodes', undefined);

    expect(component.flags()).toEqual([]);
  });

  it('renders a flag element per country code', () => {
    compRef.setInput('countryCodes', ['IT', 'DE']);

    fixture.detectChanges();

    const flags = fixture.nativeElement.querySelectorAll('.country-flag');

    expect(flags.length).toBe(2);
  });

  it('does not render the container when there are no country codes', () => {
    compRef.setInput('countryCodes', []);

    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.country-flags');

    expect(container).toBeNull();
  });
});
