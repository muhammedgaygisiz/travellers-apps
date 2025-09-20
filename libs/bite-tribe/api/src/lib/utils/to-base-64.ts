export const toBase64 = async (blob: Blob): Promise<string> =>
  await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (): void => {
      // reader.result is a data URL: "data:[<mediatype>][;base64],<data>"
      const result = reader.result as string;
      // Extract base64 part after comma
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
