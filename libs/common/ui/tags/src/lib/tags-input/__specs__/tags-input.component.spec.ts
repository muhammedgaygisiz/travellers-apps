import { beforeEach, describe, expect, it, test, vi, Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagsInputComponent } from '../tags-input.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ComponentRef } from '@angular/core';

describe('TagsInputComponent', () => {
  let component: TagsInputComponent;
  let fixture: ComponentFixture<TagsInputComponent>;
  let componentRef: ComponentRef<TagsInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagsInputComponent, ReactiveFormsModule],
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
    let emitSpy: Mock;

    beforeEach(() => {
      emitSpy = vi
        .spyOn(component.tagChanges, 'emit')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
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
        (component.formGroup as any).removeControl('tagInput');
        component.ngOnInit();
        expect(component.tagInputValueChanges$).toBeNull();
      });
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
    let emitSpy: Mock;

    beforeEach(() => {
      emitSpy = vi
        .spyOn(component.tagChanges, 'emit')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should remove tag and emit updated tags', () => {
      const tagToRemove = 'tag1';
      componentRef.setInput('tags', ['tag1', 'tag2']);
      component.removeTag(tagToRemove);
      expect(emitSpy).toHaveBeenCalledWith(['tag2']);
    });
  });
});
