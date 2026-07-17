import { ImageValidator } from '../image-validator';
import type { AbstractControl } from '@angular/forms';

const controlWithValues = (values: Record<string, string>): AbstractControl =>
  ({
    get: (key: string) =>
      Object.hasOwn(values, key) ? { value: values[key] } : null,
  }) as unknown as AbstractControl;

describe(ImageValidator.name, () => {
  it('should return null if image or imagePath is provided', () => {
    const formGroupWithImage = controlWithValues({
      image: 'some-image-data',
      imagePath: '',
    });

    const formGroupWithImagePath = controlWithValues({
      image: '',
      imagePath: 'some/image/path.jpg',
    });

    expect(ImageValidator(formGroupWithImage)).toBeNull();
    expect(ImageValidator(formGroupWithImagePath)).toBeNull();
  });

  it('should return an error if image nor imagePath is empty', () => {
    const formGroupWithoutImageAndPath = controlWithValues({
      image: '',
      imagePath: '',
    });

    expect(ImageValidator(formGroupWithoutImageAndPath)).toEqual({
      imageRequired: true,
    });
  });

  describe('given image and imagePath form controls are not defined', () => {
    it('should return an error', () => {
      const formGroupWithoutControls = controlWithValues({});

      expect(ImageValidator(formGroupWithoutControls)).toEqual({
        imageRequired: true,
      });
    });
  });
});
