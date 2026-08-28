import { LikesComponent } from '../likes.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { LikeOptionsPopoverMenuComponent } from '../../like-options-popover-menu/like-options-popover-menu.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { LikeCounts } from '../../utils/like-counts';

const likeCounts: LikeCounts = {
  thumbup: 1,
  drooling: 1,
  mindblown: 0,
};

describe(LikesComponent.name, () => {
  let component: LikesComponent;
  let componentRef: ComponentRef<LikesComponent>;
  let fixture: ComponentFixture<LikesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(LikesComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('biteId', 'bite1');
    componentRef.setInput('likeCounts', likeCounts);
    componentRef.setInput('userLikeType', 'thumbup');
  });

  it('should calculate class correctly for liked bite', () => {
    expect(component.calcClass()).toBe('liked');
  });

  it('should calculate class correctly for non-liked bite', () => {
    componentRef.setInput('userLikeType', undefined);
    fixture.detectChanges();
    expect(component.calcClass()).toBe('');
  });

  it('should calculate class correctly when there are no likes at all', () => {
    componentRef.setInput('userLikeType', undefined);
    componentRef.setInput('likeCounts', {
      thumbup: 0,
      drooling: 0,
      mindblown: 0,
    });
    fixture.detectChanges();
    expect(component.calcClass()).toBe('unliked');
  });

  describe('read-only mode', () => {
    beforeEach(() => {
      componentRef.setInput('readonly', true);
      fixture.detectChanges();
    });

    it('should calculate the read-only class regardless of the like state', () => {
      expect(component.calcClass()).toBe('readonly');
    });

    it('should still show the chip while there are likes to report', () => {
      expect(component.showChip()).toBe(true);
    });

    it('should hide the chip when there is nothing to report', () => {
      componentRef.setInput('likeCounts', {
        thumbup: 0,
        drooling: 0,
        mindblown: 0,
      });
      fixture.detectChanges();

      expect(component.showChip()).toBe(false);
    });

    it('should not open the like options popover', async () => {
      const createSpy = jest.spyOn(component['popoverController'], 'create');

      await component.openLikeOptions(new MouseEvent('click'));

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  it('should always show the chip when it is interactive', () => {
    componentRef.setInput('likeCounts', {
      thumbup: 0,
      drooling: 0,
      mindblown: 0,
    });
    fixture.detectChanges();

    expect(component.showChip()).toBe(true);
  });

  describe('getLikeEmojis', () => {
    it('should map like types with counts to emojis correctly', () => {
      const emojis = component.getLikeEmojis();
      expect(emojis).toContain('👍');
      expect(emojis).toContain('🤤');
      expect(emojis).toHaveLength(2);
    });

    it('should return empty array when there are no likes', () => {
      componentRef.setInput('likeCounts', {
        thumbup: 0,
        drooling: 0,
        mindblown: 0,
      });
      fixture.detectChanges();
      expect(component.getLikeEmojis()).toEqual([]);
    });
  });

  it('should sum the counts for total likes', () => {
    componentRef.setInput('likeCounts', {
      thumbup: 2,
      drooling: 1,
      mindblown: 3,
    });
    fixture.detectChanges();

    expect(component.totalLikeCount()).toBe(6);
  });

  it('should open like options popover when openLikeOptions is called', async () => {
    const mockEvent = new MouseEvent('click');
    const createSpy = jest.spyOn(component['popoverController'], 'create');

    await component.openLikeOptions(mockEvent);

    expect(createSpy).toHaveBeenCalledWith({
      component: LikeOptionsPopoverMenuComponent,
      event: mockEvent,
      dismissOnSelect: true,
      componentProps: {
        likeCounts,
        userLikeType: 'thumbup',
        onSelect: expect.any(Function),
      },
      cssClass: 'like-options-popover',
      alignment: 'center',
      size: 'auto',
      arrow: true,
    });
  });

  describe('onLikeSelected', () => {
    it('should emit a remove intent when selecting the current like type', () => {
      const emitSpy = jest.spyOn(component.likeButtonClick, 'emit');

      component.onLikeSelected('thumbup');

      expect(emitSpy).toHaveBeenCalledWith({
        biteId: 'bite1',
        likeType: 'thumbup',
        action: 'remove',
      });
    });

    it('should emit a save intent with the previous type when switching', () => {
      const emitSpy = jest.spyOn(component.likeButtonClick, 'emit');

      component.onLikeSelected('drooling');

      expect(emitSpy).toHaveBeenCalledWith({
        biteId: 'bite1',
        likeType: 'drooling',
        action: 'save',
        previousLikeType: 'thumbup',
      });
    });

    it('should emit a save intent without previous type when not liked yet', () => {
      componentRef.setInput('userLikeType', undefined);
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.likeButtonClick, 'emit');

      component.onLikeSelected('mindblown');

      expect(emitSpy).toHaveBeenCalledWith({
        biteId: 'bite1',
        likeType: 'mindblown',
        action: 'save',
        previousLikeType: undefined,
      });
    });
  });
});
