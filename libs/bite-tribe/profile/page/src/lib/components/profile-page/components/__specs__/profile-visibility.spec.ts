import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { ProfileVisibility } from '../profile-visibility';

// The status copy is asserted through the template, so the mock has to carry
// everything `TranslocoPipe` needs to resolve a value: an active language and a
// dependency load that settles.
const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: false,
  },
  langChanges$: of('en'),
  _loadDependencies: jest.fn(() => of({})),
};

describe(ProfileVisibility.name, () => {
  let component: ProfileVisibility;
  let fixture: ComponentFixture<ProfileVisibility>;
  let compRef: ComponentRef<ProfileVisibility>;

  // `ion-icon` takes its name as a DOM property, so it never lands on an
  // attribute the way a plain element binding would.
  const queryIcon = (): HTMLElement & { name?: string } => {
    return fixture.nativeElement.querySelector('ion-icon');
  };

  const queryStatusText = (): string | undefined => {
    const status = fixture.nativeElement.querySelector(
      '[data-testid="profile-visibility-status"]',
    ) as HTMLElement | null;

    return status?.textContent?.replace(/\s+/g, ' ').trim();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(ProfileVisibility);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  describe('given a public profile', () => {
    beforeEach(() => {
      compRef.setInput('isPublic', true);
    });

    it('should report the public state', () => {
      expect(component.isPublicProfile()).toBe(true);
      expect(component.statusKey()).toBe('profile-visibility-public');
      expect(component.hintKey()).toBe('profile-visibility-public-hint');
      expect(component.iconName()).toBe('earth-outline');
    });

    it('should render the public status and icon', () => {
      fixture.detectChanges();

      const icon = queryIcon();

      expect(queryStatusText()).toBe('profile-visibility-public');
      expect(icon.name).toBe('earth-outline');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('given a private profile', () => {
    beforeEach(() => {
      compRef.setInput('isPublic', false);
    });

    it('should report the private state', () => {
      expect(component.isPublicProfile()).toBe(false);
      expect(component.statusKey()).toBe('profile-visibility-private');
      expect(component.hintKey()).toBe('profile-visibility-private-hint');
      expect(component.iconName()).toBe('lock-closed-outline');
    });

    it('should render the private status and icon', () => {
      fixture.detectChanges();

      const icon = queryIcon();

      expect(queryStatusText()).toBe('profile-visibility-private');
      expect(icon.name).toBe('lock-closed-outline');
    });
  });

  it('should treat a profile without a saved choice as private', () => {
    compRef.setInput('isPublic', undefined);

    fixture.detectChanges();

    expect(component.isPublicProfile()).toBe(false);
    expect(queryStatusText()).toBe('profile-visibility-private');
  });

  it('should emit editClick when the status is activated', () => {
    compRef.setInput('isPublic', true);
    const editClickSpy = jest.spyOn(component.editClick, 'emit');

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="profile-visibility"]',
    ) as HTMLButtonElement;
    button.click();

    expect(editClickSpy).toHaveBeenCalled();
  });

  it('should expose the status as a button whose text is its accessible name', () => {
    compRef.setInput('isPublic', true);

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="profile-visibility"]',
    ) as HTMLButtonElement;

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'profile-visibility-public profile-visibility-public-hint profile-visibility-change',
    );
  });
});
