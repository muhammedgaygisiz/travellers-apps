import { loadBiteImageForCanvas } from '../load-bite-image-for-canvas';

/**
 * jsdom never fetches an image, so the test drives `onload` and `onerror`
 * itself and records the order in which the loader configures the element.
 */
interface FakeImage {
  image: HTMLImageElement;
  assignments: string[];
  create: () => HTMLImageElement;
}

const createFakeImage = (): FakeImage => {
  const assignments: string[] = [];
  const image = new Image();
  const record =
    (name: string) =>
    (value: string): void => {
      assignments.push(`${name}=${value}`);
    };

  Object.defineProperty(image, 'crossOrigin', { set: record('crossOrigin') });
  Object.defineProperty(image, 'src', { set: record('src') });

  return { image, assignments, create: (): HTMLImageElement => image };
};

describe(loadBiteImageForCanvas.name, () => {
  it('requests the image anonymously before it starts loading it', async () => {
    const fake = createFakeImage();

    const loaded = loadBiteImageForCanvas(
      { imagePath: 'https://storage.example/photo.jpg' },
      fake.create,
    );
    fake.image.onload?.(new Event('load'));
    await loaded;

    expect(fake.assignments).toEqual([
      'crossOrigin=anonymous',
      'src=https://storage.example/photo.jpg',
    ]);
  });

  it('resolves with the loaded image', async () => {
    const fake = createFakeImage();

    const loaded = loadBiteImageForCanvas(
      { imagePath: 'https://storage.example/photo.jpg' },
      fake.create,
    );
    fake.image.onload?.(new Event('load'));

    await expect(loaded).resolves.toBe(fake.image);
  });

  it('prefers imagePath over image, as the Display Rule does', async () => {
    const fake = createFakeImage();

    const loaded = loadBiteImageForCanvas(
      { imagePath: 'https://storage.example/new.jpg', image: 'legacy.jpg' },
      fake.create,
    );
    fake.image.onload?.(new Event('load'));
    await loaded;

    expect(fake.assignments).toContain('src=https://storage.example/new.jpg');
  });

  it('falls back to image when the Bite has no imagePath', async () => {
    const fake = createFakeImage();

    const loaded = loadBiteImageForCanvas({ image: 'legacy.jpg' }, fake.create);
    fake.image.onload?.(new Event('load'));
    await loaded;

    expect(fake.assignments).toContain('src=legacy.jpg');
  });

  it('rejects when the image fails to load', async () => {
    const fake = createFakeImage();

    const loaded = loadBiteImageForCanvas(
      { imagePath: 'https://storage.example/photo.jpg' },
      fake.create,
    );
    fake.image.onerror?.(new Event('error'));

    await expect(loaded).rejects.toThrow(
      'The Bite image could not be loaded: https://storage.example/photo.jpg',
    );
  });

  it('rejects without creating an image when the Bite has none', async () => {
    const create = jest.fn();

    await expect(
      loadBiteImageForCanvas({ imagePath: '', image: '' }, create),
    ).rejects.toThrow('The Bite has no image to load.');
    expect(create).not.toHaveBeenCalled();
  });
});
