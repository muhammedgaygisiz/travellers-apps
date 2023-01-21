import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let fixture: ComponentFixture<LoadingSpinnerComponent>;
  // eslint-disable-next-line no-unused-vars
  let component: LoadingSpinnerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoadingSpinnerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should compile', () => {
    fixture.detectChanges();

    /**
     * The login form is a presentational component, as it
     * only derives its state from inputs and communicates
     * externally through outputs. We can use snapshot
     * tests to validate the presentation state of this component
     * by changing its inputs and snapshotting the generated
     * HTML.
     *
     * We can also use this as a validation tool against changes
     * to the component's template against the currently stored
     * snapshot.
     */
    expect(fixture).toMatchSnapshot();
  });
});
