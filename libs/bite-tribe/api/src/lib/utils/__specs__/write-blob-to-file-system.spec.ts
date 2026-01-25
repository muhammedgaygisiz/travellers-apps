import { writeBlobToFileSystem } from '../write-blob-to-file-system';

const toBase64Mock = jest.fn();
jest.mock('../to-base-64', () => ({
  toBase64: (): any => toBase64Mock,
}));

jest.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: {} as any },
  Filesystem: {
    writeFile: jest.fn().mockReturnValue({ uri: 'uri' }),
  },
}));

describe('writeBlobToFileSystem', () => {
  it('should write a blob to the file system and return a WriteFileResult', async () => {
    const blob = new Blob(['Hello, world!'], { type: 'text/plain' });
    const fileName = 'test-file.txt';

    const result = await writeBlobToFileSystem(blob, fileName);

    expect(typeof result.uri).toBe('string');
  });
});
