import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  GeminiImage,
  generateWithGemini,
  GeminiUnavailableError,
} from '../shared/utils/gemini';

/**
 * One document per user, `aiUsage/{uid}`, counting the AI descriptions of the
 * current UTC day (issue #2030). Server-only: no client reads or writes it.
 */
export const AI_USAGE_COLLECTION = 'aiUsage';

/** How many descriptions one user may generate per UTC day. */
export const DAILY_DESCRIPTION_LIMIT = 10;

/** The longest description the model may write, in characters. */
export const MAX_DESCRIPTION_LENGTH = 120;

/** The largest base64 photo accepted: the app sends one shrunk to 768 px. */
const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

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

/** The app languages, by code, as the model should be told them. */
const LANGUAGES: Record<string, string> = {
  am: 'Amharic',
  ar: 'Arabic',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  th: 'Thai',
  tr: 'Turkish',
  zh: 'Chinese',
};

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

/** The UTC day a call counts against, `YYYY-MM-DD`. */
export const usageDay = (now: number): string =>
  new Date(now).toISOString().slice(0, 10);

/**
 * Counts one description against the user's day. Returns false, counting
 * nothing, once the day's limit is used up.
 */
export const takeDailyAllowance = async (
  db: Firestore,
  uid: string,
  now: number = Date.now(),
): Promise<boolean> => {
  const ref = db.collection(AI_USAGE_COLLECTION).doc(uid);
  const day = usageDay(now);

  return db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data();
    const used = data?.['day'] === day ? Number(data['descriptions']) || 0 : 0;

    if (used >= DAILY_DESCRIPTION_LIMIT) {
      return false;
    }

    transaction.set(ref, { day, descriptions: used + 1 }, { merge: true });

    return true;
  });
};

/** Gives back an allowance taken for a call that produced nothing. */
export const returnDailyAllowance = async (
  db: Firestore,
  uid: string,
  now: number = Date.now(),
): Promise<void> => {
  const ref = db.collection(AI_USAGE_COLLECTION).doc(uid);
  const day = usageDay(now);

  await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data();

    if (data?.['day'] === day && Number(data['descriptions']) > 0) {
      transaction.set(
        ref,
        { descriptions: Number(data['descriptions']) - 1 },
        { merge: true },
      );
    }
  });
};

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
 * The Storage path of one of our own download URLs, or nothing. Only our
 * bucket is read, through the Admin SDK, so a URL cannot make the function
 * fetch anything else.
 */
export const storagePathOf = (
  value: unknown,
  bucket: string,
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const url = new URL(value);
    const prefix = `/v0/b/${bucket}/o/`;

    if (
      url.hostname !== 'firebasestorage.googleapis.com' ||
      !url.pathname.startsWith(prefix)
    ) {
      return undefined;
    }

    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return undefined;
  }
};

const imageFromStorage = async (
  value: unknown,
): Promise<GeminiImage | undefined> => {
  const bucket = getStorage().bucket();
  const path = storagePathOf(value, bucket.name);

  if (!path) {
    return undefined;
  }

  const [buffer] = await bucket.file(path).download();

  return buffer.length * 1.37 > MAX_IMAGE_BASE64_LENGTH
    ? undefined
    : { mimeType: 'image/jpeg', data: buffer.toString('base64') };
};

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

  if (!(await takeDailyAllowance(db, uid))) {
    logger.info('generateBiteDescription: daily limit reached', { uid });

    return { status: 'limit' };
  }

  try {
    const image =
      imageFromDataUrl(data.image) ?? (await imageFromStorage(data.imageUrl));
    const language =
      LANGUAGES[text(data.language, 5).toLowerCase()] ?? LANGUAGES['en'];
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
    await returnDailyAllowance(db, uid);

    return { status: 'unavailable' };
  }
});
