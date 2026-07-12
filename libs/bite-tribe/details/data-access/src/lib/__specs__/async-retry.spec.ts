import { retry, withTimeout } from '../async-retry';

describe('withTimeout', () => {
  it('should resolve with the value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('should reject when the promise does not settle before the timeout', async () => {
    const neverSettles = new Promise<string>(() => undefined);

    await expect(withTimeout(neverSettles, 5)).rejects.toThrow(
      'Request timed out',
    );
  });
});

describe('retry', () => {
  it('should return the result on the first successful attempt', async () => {
    const operation = jest.fn().mockResolvedValue('ok');

    await expect(retry(operation, 3, 1)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry until the operation succeeds', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockResolvedValue('ok');

    await expect(retry(operation, 5, 1)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should reject with the last error after exhausting the attempts', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValue(new Error('last'));

    await expect(retry(operation, 3, 1)).rejects.toThrow('last');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
