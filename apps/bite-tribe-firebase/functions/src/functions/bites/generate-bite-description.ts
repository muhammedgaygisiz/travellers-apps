import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  AI_LANGUAGES,
  aiLanguageCode,
  returnDailyAllowance,
  takeDailyAllowance,
} from '../shared/utils/ai-usage';
import {
  DeploymentStage,
  resolveDeploymentStage,
} from '../shared/utils/deployment-stage';
import {
  GeminiImage,
  generateWithGemini,
  GeminiUnavailableError,
} from '../shared/utils/gemini';
import {
  imageFromStorageUrl,
  MAX_IMAGE_BASE64_LENGTH,
} from '../shared/utils/storage-image';

export { AI_USAGE_COLLECTION, usageDay } from '../shared/utils/ai-usage';
export { storagePathOf } from '../shared/utils/storage-image';

/** How many descriptions one user may generate per UTC day. */
export const DAILY_DESCRIPTION_LIMIT = 10;

/** The longest description the model may write, in characters. */
export const MAX_DESCRIPTION_LENGTH = 120;

export interface GenerateBiteDescriptionRequest {
  dishName?: unknown;
  restaurantName?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  /** A JPEG or PNG as a data URL, for a photo not uploaded yet. */
  image?: unknown;
  /** The download URL of an uploaded Bite photo, when editing a Bite. */
  imageUrl?: unknown;
  /** The app language, `en`, `de`, ... */
  language?: unknown;
}

export type GenerateBiteDescriptionResponse =
  | { status: 'ok'; description: string }
  | { status: 'limit' }
  | { status: 'unavailable' };

/**
 * The instructions, tuned on the Cusco City Top 5 dishes (issue #2030): the
 * model explains the dish rather than the plate, and leaves out what the Bite
 * already shows.
 */
export const descriptionInstructions = (language: string): string =>
  `You write the description of a dish for BiteTribe, an app where people share the dishes they ate while travelling.
Write one sentence, at most ${MAX_DESCRIPTION_LENGTH} characters, in ${language}.
Explain what the dish is - its main ingredients or how it is made - so that someone who has never eaten it understands it. Where it fits, add one detail about its place in the local food culture.
The app already shows the restaurant, the city and the photo, so do not repeat them and do not list the side dishes on the plate.
Use only what the photo, the dish name, the restaurant and the place support. If you are not sure what the dish is, describe what you see rather than guessing.
No hashtags, no emojis, no first person, no superlatives such as "best" or "must-try".`;

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const coordinate = (value: unknown, limit: number): number | undefined =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit
    ? value
    : undefined;

/** Reads a photo sent as a data URL. */
export const imageFromDataUrl = (value: unknown): GeminiImage | undefined => {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_BASE64_LENGTH) {
    return undefined;
  }

  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(
    value,
  );

  return match ? { mimeType: match[1], data: match[2] } : undefined;
};

/**
 * The answer outside production (issue #2030): QA and the emulator do not
 * call Gemini, so they need neither Vertex AI nor credentials and spend
 * nothing. The text names the stage and the dish, so a tester sees that the
 * call went through and that no model wrote it.
 */
export const sampleDescription = (
  stage: Exclude<DeploymentStage, 'production'>,
  dishName: string,
): string =>
  `[${stage.toUpperCase()}] Sample description for ${dishName}. No AI is called outside production.`;

/** What the model is told about this Bite, besides the photo. */
export const describeInputs = (
  dishName: string,
  restaurantName: string,
  latitude?: number,
  longitude?: number,
): string =>
  [
    `Dish name: ${dishName}`,
    restaurantName ? `Restaurant: ${restaurantName}` : '',
    latitude !== undefined && longitude !== undefined
      ? `Position: ${latitude}, ${longitude}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Writes a short description of a dish from what the Create Bite form holds
 * (issue #2030): the dish name, the restaurant, the position and the photo,
 * in the user's language, with Gemini on Vertex AI.
 *
 * A member may generate {@link DAILY_DESCRIPTION_LIMIT} per UTC day; a call
 * that produces nothing gives its allowance back. The answer is a suggestion
 * the user edits before posting: nothing is stored besides the day's count.
 * Outside production it answers {@link sampleDescription} instead.
 */
export const generateBiteDescription = onAppCheck<
  GenerateBiteDescriptionRequest,
  Promise<GenerateBiteDescriptionResponse>
>({ timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  requireMember(request, 'You must be signed in to generate a description.');
  const data = request.data ?? {};
  const dishName = text(data.dishName, 120);

  if (!dishName) {
    throw new HttpsError('invalid-argument', 'A dish name is required.');
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  if (
    !(await takeDailyAllowance(
      db,
      uid,
      'descriptions',
      DAILY_DESCRIPTION_LIMIT,
    ))
  ) {
    logger.info('generateBiteDescription: daily limit reached', { uid });

    return { status: 'limit' };
  }

  const stage = resolveDeploymentStage();

  if (stage !== 'production') {
    return { status: 'ok', description: sampleDescription(stage, dishName) };
  }

  try {
    const image =
      imageFromDataUrl(data.image) ??
      (await imageFromStorageUrl(data.imageUrl));
    const language = AI_LANGUAGES[aiLanguageCode(data.language)];
    const answer = await generateWithGemini({
      system: descriptionInstructions(language),
      text: describeInputs(
        dishName,
        text(data.restaurantName, 120),
        coordinate(data.latitude, 90),
        coordinate(data.longitude, 180),
      ),
      image,
      responseSchema: {
        type: 'OBJECT',
        properties: { description: { type: 'STRING' } },
        required: ['description'],
      },
      maxOutputTokens: 200,
    });
    const description = text(answer.json['description'], 300);

    if (!description) {
      throw new GeminiUnavailableError('Gemini wrote an empty description.');
    }

    logger.info('generateBiteDescription: description written', {
      uid,
      withImage: !!image,
      language,
      inputTokens: answer.inputTokens,
      outputTokens: answer.outputTokens,
    });

    return { status: 'ok', description };
  } catch (error) {
    logger.warn('generateBiteDescription: no description', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    await returnDailyAllowance(db, uid, 'descriptions');

    return { status: 'unavailable' };
  }
});
