import { ImageValidator } from '../image-validator';

describe(ImageValidator.name, () => {
  it('should return null if image or imagePath is provided', () => {
    const formGroupWithImage = {
      get: (key: string) => {
        if (key === 'image') return { value: 'some-image-data' };
        if (key === 'imagePath') return { value: '' };
        return null;
      },
    } as any;

    const formGroupWithImagePath = {
      get: (key: string) => {
        if (key === 'image') return { value: '' };
        if (key === 'imagePath') return { value: 'some/image/path.jpg' };
        return null;
      },
    } as any;

    expect(ImageValidator(formGroupWithImage)).toBeNull();
    expect(ImageValidator(formGroupWithImagePath)).toBeNull();
  });

  it('should return an error if neither image nor imagePath is provided', () => {
    const formGroupWithoutImageAndPath = {
      get: (key: string) => {
        if (key === 'image') return { value: '' };
        if (key === 'imagePath') return { value: '' };
        return null;
      },
    } as any;

    expect(ImageValidator(formGroupWithoutImageAndPath)).toEqual({
      imageRequired: true,
    });
  });
});
