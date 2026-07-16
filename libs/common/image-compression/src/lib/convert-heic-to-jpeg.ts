export const convertHeicToJpeg = async (file: File): Promise<File> => {
  // heic2any is a large, non-ESM dependency that is only needed for the rare
  // HEIC/HEIF path, so it is loaded on demand instead of being bundled into
  // every entry point that can upload an image.
  const { default: heic2any } = await import('heic2any');

  const jpegBlob = (await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.7,
  })) as Blob;

  const outName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], outName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};
