import hasLength from '../has-length';

describe('hasLength', () => {
  describe('given empty password', () => {
    describe('and length 0', () => {
      it('should true', () => {
        const resultFn = hasLength('', 0);

        expect(resultFn()).toEqual(true);
      });
    });

    describe('and length 1', () => {
      it('should false', () => {
        const resultFn = hasLength('', 1);

        expect(resultFn()).toEqual(false);
      });
    });
  });

  describe('given a password', () => {
    const PASSWORD = 'password';

    describe('and length 0', () => {
      it('should true', () => {
        const resultFn = hasLength(PASSWORD, 0);

        expect(resultFn()).toEqual(true);
      });
    });

    describe('and length 10', () => {
      it('should false', () => {
        const resultFn = hasLength(PASSWORD, 10);

        expect(resultFn()).toEqual(false);
      });
    });
  });
});
