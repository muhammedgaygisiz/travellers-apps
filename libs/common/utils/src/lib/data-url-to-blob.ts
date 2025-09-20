export const dataUrlToBlob = async (
  dataUrl: string
): Promise<{
  contentType: string;
  bytes: Uint8Array<ArrayBuffer>;
  blob: Blob;
}> => {
  // data:image/jpeg;base64,AAAA...
  const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) throw new Error('Not a data URL');
  const [, contentType, b64] = m;

  // Decode base64 → binary
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // You can return both a Blob and the raw Uint8Array if you like
  const result = {
    contentType,
    bytes, // Uint8Array
    blob: new Blob([bytes], { type: contentType }), // directly usable in <img src={URL.createObjectURL(blob)}>
  };

  return result;
};
