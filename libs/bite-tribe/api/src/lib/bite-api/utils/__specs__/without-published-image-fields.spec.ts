import { withoutPublishedImageFields } from '../without-published-image-fields';

describe(withoutPublishedImageFields.name, () => {
  it('drops the fields only the upload trigger may write, and keeps the rest', () => {
    expect(
      withoutPublishedImageFields({
        name: 'Pho',
        image: '',
        imagePath: 'https://photo',
        imageStatus: 'uploaded',
        imageRefusalCategory: 'hate',
      }),
    ).toEqual({ name: 'Pho', image: '' });
  });
});
