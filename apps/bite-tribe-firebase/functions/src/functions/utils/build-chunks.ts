export const buildChunks = (
  tokens: string[],
  chunkSize: number,
): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }
  return chunks;
};
