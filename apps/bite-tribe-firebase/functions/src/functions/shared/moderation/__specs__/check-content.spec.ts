import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/gemini', () => {
  class GeminiUnavailableError extends Error {}

  return {
    GEMINI_MODEL: 'test-model',
    GeminiUnavailableError,
    generateWithGemini: jest.fn(),
  };
});

jest.mock('../../utils/deployment-stage', () => ({
  resolveDeploymentStage: jest.fn(() => 'production'),
}));

import { Firestore } from 'firebase-admin/firestore';
import { resolveDeploymentStage } from '../../utils/deployment-stage';
import { generateWithGemini, GeminiUnavailableError } from '../../utils/gemini';
import {
  checkContent,
  CONTENT_CHECKS_COLLECTION,
  describeFields,
} from '../check-content';

const gemini = generateWithGemini as jest.Mock;
const stage = resolveDeploymentStage as jest.Mock;

let db: FakeFirestore;
const asDb = (): Firestore => db as unknown as Firestore;

describe('checkContent', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    gemini.mockReset();
    stage.mockReturnValue('production');
  });

  it('allows no text at all without asking anyone', async () => {
    await expect(
      checkContent(asDb(), [{ field: 'name', value: '   ' }]),
    ).resolves.toEqual({ verdict: 'allowed' });
    expect(gemini).not.toHaveBeenCalled();
  });

  it('refuses a listed term from the wordlist, naming the field, without the model', async () => {
    await expect(
      checkContent(asDb(), [
        { field: 'name', value: 'Ramen' },
        { field: 'tags', value: 'cunt, spicy' },
      ]),
    ).resolves.toEqual({
      verdict: 'refused',
      field: 'tags',
      source: 'wordlist',
      reason: 'cunt',
    });
    expect(gemini).not.toHaveBeenCalled();
  });

  it('asks the model about what the wordlist passed, and keeps its verdict', async () => {
    gemini.mockResolvedValue({ json: { category: 'harassment' } });

    const fields = [
      { field: 'review', value: 'The waiter deserves a beating' },
    ];

    await expect(checkContent(asDb(), fields)).resolves.toEqual({
      verdict: 'refused',
      field: 'content',
      source: 'model',
      reason: 'harassment',
    });
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(gemini.mock.calls[0][0].text).toBe(describeFields(fields));

    await checkContent(asDb(), fields);

    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it('allows what the model calls none, and treats an unknown answer as none', async () => {
    gemini.mockResolvedValueOnce({ json: { category: 'none' } });
    gemini.mockResolvedValueOnce({ json: { category: 'something-else' } });

    await expect(
      checkContent(asDb(), [{ field: 'name', value: 'Spicy balls' }]),
    ).resolves.toEqual({ verdict: 'allowed' });
    await expect(
      checkContent(asDb(), [{ field: 'name', value: 'Another dish' }]),
    ).resolves.toEqual({ verdict: 'allowed' });
  });

  it('lets the wordlist verdict stand when the model cannot answer, and keeps nothing', async () => {
    gemini.mockRejectedValue(new GeminiUnavailableError('quota'));

    await expect(
      checkContent(asDb(), [{ field: 'name', value: 'Pad thai' }]),
    ).resolves.toEqual({ verdict: 'allowed' });

    gemini.mockResolvedValue({ json: { category: 'none' } });
    await checkContent(asDb(), [{ field: 'name', value: 'Pad thai' }]);

    expect(gemini).toHaveBeenCalledTimes(2);
  });

  it('does not call the model outside production', async () => {
    stage.mockReturnValue('qa');

    await expect(
      checkContent(asDb(), [{ field: 'name', value: 'Anything' }]),
    ).resolves.toEqual({ verdict: 'allowed' });
    expect(gemini).not.toHaveBeenCalled();
  });

  it('keeps a model verdict by a hash of the text, never the text itself', async () => {
    gemini.mockResolvedValue({ json: { category: 'none' } });

    await checkContent(asDb(), [{ field: 'name', value: 'Ceviche' }]);

    const stored = db
      .collection(CONTENT_CHECKS_COLLECTION)
      .where('category', '==', 'none');
    const snapshot = await stored.get();

    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].id).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(snapshot.docs[0].data())).not.toContain('Ceviche');
  });
});
