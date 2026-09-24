import {
  getSignInErrorCode,
  isSignInCancellation,
} from '../sign-in-cancellation';

describe(isSignInCancellation.name, () => {
  // What each platform actually reports when the user dismisses the provider,
  // as `@capacitor-firebase/authentication` 8 rejects the call.
  it.each([
    ['web popup closed', { code: 'auth/popup-closed-by-user' }],
    ['web popup superseded', { code: 'auth/cancelled-popup-request' }],
    ['Firebase user cancellation', { code: 'auth/user-cancelled' }],
    [
      'Google Sign-In on iOS',
      { message: 'The user canceled the sign-in flow.' },
    ],
    [
      'Sign in with Apple on iOS',
      {
        message:
          "The operation couldn't be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)",
      },
    ],
    [
      'the Android authorization intent',
      { message: 'Authorization canceled.' },
    ],
    [
      'Credential Manager on Android',
      { message: 'activity is cancelled by the user.' },
    ],
    ['the legacy Android Google client', { message: '12501: ' }],
  ])('should treat %s as a cancellation', (_, error) => {
    expect(isSignInCancellation(error)).toBe(true);
  });

  it.each([
    ['a backend rejection', { code: 'auth/internal-error' }],
    ['a wrong password', { code: 'auth/wrong-password' }],
    ['an App Check refusal', new Error('Firebase App Check token is invalid.')],
    ['a network failure', new Error('network request failed')],
    ['nothing', undefined],
    ['null', null],
  ])('should not treat %s as a cancellation', (_, error) => {
    expect(isSignInCancellation(error)).toBe(false);
  });

  // A Firebase code means Firebase judged the attempt; the message does not
  // overrule that.
  it('should trust a rejecting code over a message that mentions cancelling', () => {
    expect(
      isSignInCancellation({
        code: 'auth/internal-error',
        message: 'The request was cancelled by the server.',
      }),
    ).toBe(false);
  });
});

describe(getSignInErrorCode.name, () => {
  it('should read the code a failure carries', () => {
    expect(getSignInErrorCode({ code: 'auth/user-disabled' })).toBe(
      'auth/user-disabled',
    );
  });

  it.each([[{}], [{ code: '' }], [{ code: 7 }], [undefined], [null]])(
    'should answer nothing for %p',
    (error) => {
      expect(getSignInErrorCode(error)).toBeUndefined();
    },
  );
});
