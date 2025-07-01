import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CustomFilterModalComponent } from '../custom-filter-modal.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { addNecessaryIcons } from 'utils';

addNecessaryIcons();

describe('CustomFilterModalComponent', () => {
  let component: CustomFilterModalComponent;
  let fixture: ComponentFixture<CustomFilterModalComponent>;
  let dialogRef: DialogRef<{ selectedTags?: string[]; clearFilters?: boolean }>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FormsModule, ReactiveFormsModule],
      providers: [
        {
          provide: DIALOG_DATA,
          useValue: {
            existingTags: ['tag1', 'tag2', 'tag3'],
            selectedFilters: ['tag1'],
          },
        },
        {
          provide: DialogRef,
          useValue: {
            close: jest.fn(),
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomFilterModalComponent);
    component = fixture.componentInstance;
    dialogRef = TestBed.inject(DialogRef);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize selected tags from data', () => {
    expect(component.selectedTags()).toEqual(['tag1']);
  });

  it('should filter tags based on search input', () => {
    component.customTagInput.set('tag2');
    expect(component.filteredTags()).toEqual(['tag2']);
  });

  it('should toggle tag selection', () => {
    component.toggleTag('tag2');
    expect(component.selectedTags()).toContain('tag2');

    component.toggleTag('tag2');
    expect(component.selectedTags()).not.toContain('tag2');
  });

  it('should add custom tag', () => {
    component.customTagInput.set('customTag');
    component.addCustomTag();
    expect(component.selectedTags()).toContain('customTag');
    expect(component.customTagInput()).toBe('');
  });

  it('should apply filters and close dialog with selected tags', () => {
    component.applyFilters();
    expect(dialogRef.close).toHaveBeenCalledWith({ selectedTags: ['tag1'] });
  });
});
