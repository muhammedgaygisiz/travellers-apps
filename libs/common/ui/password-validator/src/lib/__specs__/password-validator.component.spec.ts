import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordValidatorComponent } from '../component/password-validator.component';
import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { EMPTY, of } from 'rxjs';
import { ComponentRef } from '@angular/core';
import { addNecessaryIcons } from 'utils';

jest.mock('memoizee');
addNecessaryIcons();

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

describe('PasswordValidatorComponent', () => {
  let component: PasswordValidatorComponent;
  let fixture: ComponentFixture<PasswordValidatorComponent>;
  let componentRef: ComponentRef<PasswordValidatorComponent>;

  let scheduler: TestScheduler;

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordValidatorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();

    scheduler = new TestScheduler(assertDeepEqual);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('should call initStreams', () => {
      const initStreamsSpy = jest.spyOn(component as any, 'initStreams');

      component.ngOnChanges();

      expect(initStreamsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasLowerCaseLetterColor$', () => {
    describe('given an lower case letter', () => {
      it('should return class name success', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('abc'));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: 'success' }
          );
        });
      });
    });

    describe('given no lower case letter', () => {
      it('should return class name danger', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('ABC'));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: 'danger' }
          );
        });
      });
    });

    describe('given null', () => {
      it('should return empty string', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: '' }
          );
        });
      });
    });
  });

  describe('hasLowerCaseLetterIcon$', () => {
    describe('given an lower case letter', () => {
      it('should return checkmark-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('abc'));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'checkmark-outline' }
          );
        });
      });
    });

    describe('given no lower case letter', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('ABC'));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'close-outline' }
          );
        });
      });
    });

    describe('given null', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasLowerCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'close-outline' }
          );
        });
      });
    });
  });

  describe('hasUpperCaseLetterColor$', () => {
    describe('given an upper case letter', () => {
      it('should return class name success', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('ABC'));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: 'success' }
          );
        });
      });
    });

    describe('given no upper case letter', () => {
      it('should return class name danger', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('abc'));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: 'danger' }
          );
        });
      });
    });

    describe('given null', () => {
      it('should return empty string', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterColor$ || EMPTY).toBe(
            '(a|)',
            { a: '' }
          );
        });
      });
    });
  });

  describe('hasUpperCaseLetterIcon$', () => {
    describe('given an upper case letter', () => {
      it('should return checkmark-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('ABC'));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'checkmark-outline' }
          );
        });
      });
    });

    describe('given no upper case letter', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('abc'));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'close-outline' }
          );
        });
      });
    });

    describe('given null', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasUpperCaseLetterIcon$ || EMPTY).toBe(
            '(a|)',
            { a: 'close-outline' }
          );
        });
      });
    });
  });

  describe('hasNumberColor$', () => {
    describe('given a number', () => {
      it('should return success', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('a1'));
          component.ngOnChanges();

          expectObservable(component.hasNumberColor$ || EMPTY).toBe('(a|)', {
            a: 'success',
          });
        });
      });
    });

    describe('given no number', () => {
      it('should return danger', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('aa'));
          component.ngOnChanges();

          expectObservable(component.hasNumberColor$ || EMPTY).toBe('(a|)', {
            a: 'danger',
          });
        });
      });
    });

    describe('given null', () => {
      it('should return empty string', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasNumberColor$ || EMPTY).toBe('(a|)', {
            a: '',
          });
        });
      });
    });
  });

  describe('hasNumberIcon$', () => {
    describe('given a number', () => {
      it('should return checkmark-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('a1'));
          component.ngOnChanges();

          expectObservable(component.hasNumberIcon$ || EMPTY).toBe('(a|)', {
            a: 'checkmark-outline',
          });
        });
      });
    });

    describe('given no number', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('aa'));
          component.ngOnChanges();

          expectObservable(component.hasNumberIcon$ || EMPTY).toBe('(a|)', {
            a: 'close-outline',
          });
        });
      });
    });

    describe('given null', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasNumberIcon$ || EMPTY).toBe('(a|)', {
            a: 'close-outline',
          });
        });
      });
    });
  });

  describe('hasLength8Color$', () => {
    describe('given with length > 8', () => {
      it('should return success', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('123456789'));
          component.ngOnChanges();

          expectObservable(component.hasLength8Color$ || EMPTY).toBe('(a|)', {
            a: 'success',
          });
        });
      });
    });

    describe('given no number', () => {
      it('should return danger', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('aa'));
          component.ngOnChanges();

          expectObservable(component.hasLength8Color$ || EMPTY).toBe('(a|)', {
            a: 'danger',
          });
        });
      });
    });

    describe('given null', () => {
      it('should return empty string', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasLength8Color$ || EMPTY).toBe('(a|)', {
            a: '',
          });
        });
      });
    });
  });

  describe('hasLength8Icon$', () => {
    describe('given with length > 8', () => {
      it('should return checkmark-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('123456789'));
          component.ngOnChanges();

          expectObservable(component.hasLength8Icon$ || EMPTY).toBe('(a|)', {
            a: 'checkmark-outline',
          });
        });
      });
    });

    describe('given no number', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of('aa'));
          component.ngOnChanges();

          expectObservable(component.hasLength8Icon$ || EMPTY).toBe('(a|)', {
            a: 'close-outline',
          });
        });
      });
    });

    describe('given null', () => {
      it('should return close-outline', () => {
        scheduler.run(({ expectObservable }) => {
          componentRef.setInput('password$', of(null));
          component.ngOnChanges();

          expectObservable(component.hasLength8Icon$ || EMPTY).toBe('(a|)', {
            a: 'close-outline',
          });
        });
      });
    });
  });
});
