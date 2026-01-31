export const FirebaseStorage = {
  uploadFile: jest.fn((_: any, callback: any): void => {
    callback({ completed: true }, null);
  }),
  deleteFile: jest.fn(),
  getDownloadUrl: jest.fn().mockResolvedValue({
    downloadUrl: 'https://url-to-mirrored-image.com/avatar.jpg',
  }),
};
