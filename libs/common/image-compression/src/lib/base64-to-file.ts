export const base64ToFile = (
  base64: string | undefined = '',
  format: string
): File => {
  try {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';

    // If there's no comma, arr[1] will be undefined
    if (!arr[1]) {
      // For raw base64 without data URI, try to decode the whole string
      const bstr = base64 ? atob(base64) : '';
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      return new File([u8arr], `file.${format}`, { type: '' });
    }

    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new File([u8arr], `file.${format}`, { type: mime });
  } catch (error) {
    // If atob fails or any other error occurs, return an empty file
    return new File([''], `file.${format}`, { type: '' });
  }
};
