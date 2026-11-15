/** The longest side of the photo sent for an AI description (issue #2030). */
export const DESCRIPTION_IMAGE_SIZE = 768;

/**
 * Shrinks a photo data URL to at most {@link DESCRIPTION_IMAGE_SIZE} pixels on
 * its longer side, as a JPEG. The model needs no more to recognise a dish, and
 * a smaller photo is cheaper and quicker to send: most of what a description
 * costs is the photo. Resolves to nothing when the photo cannot be drawn, and
 * the description is then written from the text alone.
 */
export const shrinkImageForDescription = (
  dataUrl: string,
  document: Document,
  size: number = DESCRIPTION_IMAGE_SIZE,
): Promise<string | undefined> =>
  new Promise((resolve) => {
    const image = new Image();

    image.onload = (): void => {
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        resolve(undefined);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.onerror = (): void => resolve(undefined);
    image.src = dataUrl;
  });
