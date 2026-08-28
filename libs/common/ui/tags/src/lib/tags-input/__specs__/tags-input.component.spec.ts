import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagsInputComponent } from '../tags-input.component';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ComponentRef } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('TagsInputComponent', () => {
  let component: TagsInputComponent;
  let fixture: ComponentFixture<TagsInputComponent>;
  let componentRef: ComponentRef<TagsInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagsInputComponent, ReactiveFormsModule],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TagsInputComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize tagInputValueChanges$ observable', () => {
      component.ngOnInit();
      expect(component.tagInputValueChanges$).toBeDefined();
    });
  });

  describe('inputChange', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
    });

    it('should emit tagChanges with new tag if input is not blank', () => {
      const newTag = 'test';
      componentRef.setInput('tags', ['existing']);
      component.inputChange(newTag);
      expect(emitSpy).toHaveBeenCalledWith(['existing', newTag]);
    });

    it('should not emit tagChanges if input is blank', () => {
      component.inputChange('   ');
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit tagChanges if tag already exists', () => {
      componentRef.setInput('tags', ['existing']);
      component.inputChange('existing');
      expect(emitSpy).not.toHaveBeenCalled();
    });

    describe('given no control', () => {
      test('tagInputValueChanges should be null', () => {
        (component.formGroup as FormGroup).removeControl('tagInput');
        component.ngOnInit();
        expect(component.tagInputValueChanges$).toBeNull();
      });
    });
  });

  // Issue #1391: only a delimiter committed a tag, so text typed and then
  // submitted, confirmed with Enter, or left behind by tapping elsewhere was
  // dropped without a word.
  describe('commitPendingTag', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
    });

    it('should commit the text still in the field as a tag', () => {
      componentRef.setInput('tags', ['existing']);
      component.formGroup.get('tagInput')?.setValue('run9test');

      component.commitPendingTag();

      expect(emitSpy).toHaveBeenCalledWith(['existing', 'run9test']);
    });

    it('should clear the field after committing', () => {
      component.formGroup.get('tagInput')?.setValue('run9test');

      component.commitPendingTag();

      expect(component.formGroup.get('tagInput')?.value).toBe('');
    });

    it('should trim the committed tag', () => {
      component.formGroup.get('tagInput')?.setValue('  run9test  ');

      component.commitPendingTag();

      expect(emitSpy).toHaveBeenCalledWith(['run9test']);
    });

    it('should not emit when the field is empty', () => {
      component.commitPendingTag();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should clear a field holding only blank space without emitting', () => {
      component.formGroup.get('tagInput')?.setValue('   ');

      component.commitPendingTag();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.formGroup.get('tagInput')?.value).toBe('');
    });

    it('should not emit a tag that already exists', () => {
      componentRef.setInput('tags', ['existing']);
      component.formGroup.get('tagInput')?.setValue('existing');

      component.commitPendingTag();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onEnter', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
    });

    it('should commit the pending tag', () => {
      component.formGroup.get('tagInput')?.setValue('run9test');

      component.onEnter(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(emitSpy).toHaveBeenCalledWith(['run9test']);
    });

    it('should keep Enter from submitting the surrounding form', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });

      component.onEnter(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  // The wiring is the fix: without these bindings the handlers above are never
  // reached and the tag is lost again (issue #1391).
  describe('input wiring', () => {
    let emitSpy: jest.SpyInstance;
    let input: HTMLElement;

    beforeEach(() => {
      fixture.detectChanges();
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
      input = fixture.nativeElement.querySelector('ion-input');
      component.formGroup.get('tagInput')?.setValue('run9test');
    });

    it('should commit the pending tag when the field loses focus', () => {
      input.dispatchEvent(new CustomEvent('ionBlur'));

      expect(emitSpy).toHaveBeenCalledWith(['run9test']);
    });

    it('should commit the pending tag on Enter', () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(emitSpy).toHaveBeenCalledWith(['run9test']);
    });
  });

  describe('clearInput', () => {
    it('should clear the input field', () => {
      component.formGroup.get('tagInput')?.setValue('test');
      component.clearInput();
      expect(component.formGroup.get('tagInput')?.value).toBe('');
    });
  });

  describe('removeTag', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
    });

    it('should remove tag and emit updated tags', () => {
      const tagToRemove = 'tag1';
      componentRef.setInput('tags', ['tag1', 'tag2']);
      component.removeTag(tagToRemove);
      expect(emitSpy).toHaveBeenCalledWith(['tag2']);
    });
  });

  describe('addSuggestedTag', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.tagChanges, 'emit').mockImplementation();
    });

    it('should add suggested tag and emit updated tags', () => {
      const suggestedTag = 'newTag';
      componentRef.setInput('tags', ['existing']);
      component.addSuggestedTag(suggestedTag);
      expect(emitSpy).toHaveBeenCalledWith(['existing', 'newTag']);
    });

    it('should not add suggested tag if it already exists', () => {
      const existingTag = 'existing';
      componentRef.setInput('tags', ['existing']);
      component.addSuggestedTag(existingTag);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
