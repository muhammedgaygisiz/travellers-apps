export const FirebaseAuthentication = {
  getCurrentUser: jest.fn(),
  addListener: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
};
