import heic2any from 'heic2any';

export const convertHeicToJpeg = async (file: File): Promise<File> => {
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
