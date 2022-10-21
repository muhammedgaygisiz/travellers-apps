import { ImageUrlValidator } from '../async-validators/image-url.validator';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { Observable, of } from 'rxjs';

const validImageUrl = 'some-valid-image-url';
const invalidImageUrl = 'some-invalid-image-url';

// It is important, that code including a promise, can not be tested
// with the TestScheduler, so we do not mock here with
// fromPromise(Promise.resolve({
//   ok: input === validImageUrl
// }))

// https://rxjs.dev/guide/testing/marble-testing#known-issues
jest.mock('rxjs/internal/observable/dom/fetch', () => ({
  fromFetch: jest.fn((input: string) =>
    of({
      ok: input === validImageUrl,
    })
  ),
}));

const testScheduler: TestScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

describe('ImageUrlValidator', () => {
  describe('given an image url validator object, a control', () => {
    const imageUrlValidator = new ImageUrlValidator();
    const someControl = (url: string) =>
      ({
        getRawValue: jest.fn(() => url),
      } as unknown as AbstractControl);

    describe('and a valid image url', () => {
      const someValidImageUrl = validImageUrl;

      it('should return null', () => {
        testScheduler.run((helpers) => {
          const { expectObservable } = helpers;

          const validate = imageUrlValidator.validate(
            someControl(someValidImageUrl)
          ) as Observable<ValidationErrors | null>;

          expectObservable(validate).toBe('(a|)', { a: null });
        });
      });
    });

    describe('and an invalid image url', () => {
      const someInvalidImageUrl = invalidImageUrl;

      it('should return error object', () => {
        testScheduler.run((helpers) => {
          const { expectObservable, cold } = helpers;

          const validate = imageUrlValidator.validate(
            someControl(someInvalidImageUrl)
          ) as Observable<ValidationErrors | null>;

          const expected = cold('(a|)', { a: { errorOnLoad: {} } });

          expectObservable(validate).toEqual(expected);
        });
      });
    });
  });
});
