import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonChip } from '@ionic/angular/standalone';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu.component';

describe('LikeOptionsPopoverMenuComponent', () => {
  let component: LikeOptionsPopoverMenuComponent;
  let fixture: ComponentFixture<LikeOptionsPopoverMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LikeOptionsPopoverMenuComponent, IonChip],
    }).compileComponents();

    fixture = TestBed.createComponent(LikeOptionsPopoverMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render three ion-chips with emojis', () => {
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    expect(chips.length).toBe(3);
    expect(chips[0].textContent).toContain('👍');
    expect(chips[1].textContent).toContain('🤤');
    expect(chips[2].textContent).toContain('🤯');
  });

  it('should render the counts as badges', () => {
    component.likeCounts = { thumbup: 2, drooling: 3, mindblown: 4 };
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('ion-badge');

    expect(badges.length).toBe(3);
    expect(badges[0].textContent).toContain('2');
    expect(badges[1].textContent).toContain('3');
    expect(badges[2].textContent).toContain('4');
  });

  it('should hide badges for zero counts', () => {
    component.likeCounts = { thumbup: 1, drooling: 0, mindblown: 0 };
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('ion-badge');

    expect(badges.length).toBe(1);
  });

  it('should mark the chip of the user like type as liked', () => {
    component.userLikeType = 'drooling';
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    expect(chips[0].classList).not.toContain('liked');
    expect(chips[1].classList).toContain('liked');
    expect(chips[2].classList).not.toContain('liked');
  });

  it('should call onSelect with the like type for each chip click', () => {
    const onSelect = jest.fn();
    component.onSelect = onSelect;
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('ion-chip');

    chips[0].click();
    expect(onSelect).toHaveBeenCalledWith('thumbup');

    chips[1].click();
    expect(onSelect).toHaveBeenCalledWith('drooling');

    chips[2].click();
    expect(onSelect).toHaveBeenCalledWith('mindblown');
  });
});
