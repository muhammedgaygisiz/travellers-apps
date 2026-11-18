import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
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
  GEMINI_MODEL,
  generateWithGemini,
  GeminiUnavailableError,
} from '../shared/utils/gemini';
import {
  imageFromStoragePath,
  storagePathOf,
} from '../shared/utils/storage-image';

/**
 * The stored explanations, one per Bite and language:
 * `biteExplanations/{biteId}_{language}` (issue #2106). Server-only: the
 * Firestore rules' default deny covers it, and
 * `deleteBiteExplanationsOnBiteDelete` removes a Bite's with the Bite.
 */
export const BITE_EXPLANATIONS_COLLECTION = 'biteExplanations';

/** How many new explanations one member may have written per UTC day. */
export const DAILY_EXPLANATION_LIMIT = 20;

/** The fewest and most typical ingredients an explanation lists. */
const MIN_INGREDIENTS = 3;
const MAX_INGREDIENTS = 6;

export interface ExplainBiteRequest {
  biteId?: unknown;
  /** The app language, `en`, `de`, ... */
  language?: unknown;
}

/** The three parts of an explanation, in the requested language. */
export interface BiteExplanation {
  whatItIs: string;
  origin: string;
  ingredients: string[];
}

export type ExplainBiteResponse =
  | { status: 'ok'; cached: boolean; explanation: BiteExplanation }
  | { status: 'unknown'; cached: boolean }
  | { status: 'limit' }
  | { status: 'unavailable' };

/** A stored explanation, as `biteExplanations` holds it. */
export interface StoredBiteExplanation extends Partial<BiteExplanation> {
  biteId: string;
  language: string;
  /** The Bite's name it was written for; a renamed Bite gets a new one. */
  dishName: string;
  status: 'ok' | 'unknown';
  model: string;
  createdAt: string;
}

/** The document id of a Bite's explanation in one language. */
export const explanationId = (biteId: string, language: string): string =>
  `${biteId}_${language}`;

/**
 * The instructions (issue #2106): the dish as it is usually made rather than
 * this plate, short, and never a claim about allergens or diets - a wrong "no
 * nuts" is a safety problem, and the app adds its own disclaimer.
 */
export const explanationInstructions = (language: string): string =>
  `You explain a dish to a traveller using BiteTribe, an app where people share the dishes they ate while travelling. The traveller does not know the dish.
Write in ${language}. Explain the dish as it is typically made, not this restaurant's plate.
- whatItIs: one or two short sentences on what the dish is.
- origin: one or two short sentences on where it comes from - the country or region, and its place in the local food culture where it fits.
- ingredients: ${MIN_INGREDIENTS} to ${MAX_INGREDIENTS} typical main ingredients, each a few words.
Use only what the dish name, the restaurant, the place and the photo support. If you cannot tell which dish this is, answer status "unknown" and leave the other fields empty; otherwise answer status "ok".
Never state allergens or dietary properties, such as vegan, vegetarian, halal, kosher, gluten-free or "contains nuts".
No hashtags, no emojis, no first person, no superlatives such as "best" or "must-try".`;

/** What the model is told about the Bite, besides the photo. */
export const explanationInputs = (bite: {
  name: string;
  place?: unknown;
  city?: unknown;
  country?: unknown;
}): string =>
  [
    `Dish name: ${bite.name}`,
    typeof bite.place === 'string' && bite.place.trim()
      ? `Restaurant: ${bite.place.trim()}`
      : '',
    typeof bite.city === 'string' && bite.city.trim()
      ? `City: ${bite.city.trim()}`
      : '',
    typeof bite.country === 'string' && bite.country.trim()
      ? `Country: ${bite.country.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * The answer outside production: QA and the emulator never call Gemini, so
 * the text names the stage and the dish, and a tester sees that the call went
 * through and that no model wrote it. It is stored like a real one, so the
 * cache can be tested there too.
 */
export const sampleExplanation = (
  stage: Exclude<DeploymentStage, 'production'>,
  dishName: string,
  language: string,
): BiteExplanation => {
  const mark = `[${stage.toUpperCase()}]`;

  return {
    whatItIs: `${mark} Sample explanation of ${dishName} in ${language}. No AI is called outside production.`,
    origin: `${mark} Sample origin.`,
    ingredients: [
      `${mark} Ingredient 1`,
      `${mark} Ingredient 2`,
      `${mark} Ingredient 3`,
    ],
  };
};

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** The model's answer as an explanation, or nothing when it is incomplete. */
export const toExplanation = (
  json: Record<string, unknown>,
): BiteExplanation | undefined => {
  const whatItIs = text(json['whatItIs'], 400);
  const origin = text(json['origin'], 400);
  const ingredients = Array.isArray(json['ingredients'])
    ? json['ingredients']
        .map((item) => text(item, 60))
        .filter(Boolean)
        .slice(0, MAX_INGREDIENTS)
    : [];

  return whatItIs && origin && ingredients.length
    ? { whatItIs, origin, ingredients }
    : undefined;
};

/** The stored document as the callable's answer, or nothing when unusable. */
export const fromStored = (
  stored: Partial<StoredBiteExplanation> | undefined,
  dishName: string,
): ExplainBiteResponse | undefined => {
  if (!stored || stored.dishName !== dishName) {
    return undefined;
  }

  if (stored.status === 'unknown') {
    return { status: 'unknown', cached: true };
  }

  const explanation = toExplanation(stored as Record<string, unknown>);

  return explanation ? { status: 'ok', cached: true, explanation } : undefined;
};

/**
 * The Storage path of the Bite's photo in our own bucket. `imagePath` is the
 * download URL `setBiteImagePathOnUpload` writes, not a Storage path, so both
 * it and the older `image` field go through {@link storagePathOf}, which also
 * refuses a URL of any other bucket or host.
 */
export const photoPathOf = (
  bite: Record<string, unknown>,
  bucket: string = getStorage().bucket().name,
): string | undefined =>
  storagePathOf(bite['imagePath'], bucket) ??
  storagePathOf(bite['image'], bucket);

/**
 * Explains a Bite's dish in the member's app language (issue #2106): what it
 * is, where it comes from and its typical ingredients.
 *
 * One explanation is kept per Bite and language, and reused while the Bite's
 * name is the one it was written for. A kept one costs nothing; a new one
 * takes one of {@link DAILY_EXPLANATION_LIMIT} per UTC day, given back when
 * the call produces nothing. The model is given the Bite's name, place, city,
 * country and photo - never the creator's description or tags, because the
 * answer is shown to every later reader. Outside production it stores and
 * answers {@link sampleExplanation} instead.
 */
export const explainBite = onAppCheck<
  ExplainBiteRequest,
  Promise<ExplainBiteResponse>
>({ timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  requireMember(request, 'You must be signed in to explain a Bite.');
  const data = request.data ?? {};
  const biteId = text(data.biteId, 128);

  if (!biteId || biteId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A Bite id is required.');
  }

  const db = getFirestore();
  const uid = request.auth.uid;
  const language = aiLanguageCode(data.language);
  const bite = (await db.collection('bites').doc(biteId).get()).data();

  if (!bite) {
    throw new HttpsError('not-found', 'The Bite does not exist.');
  }

  const dishName = text(bite['name'], 120);

  // The button is not offered before the photo is up, so the explanation is
  // never written without it (issue #2106).
  if (
    !dishName ||
    bite['imageStatus'] === 'pending' ||
    bite['imageStatus'] === 'failed'
  ) {
    return { status: 'unavailable' };
  }

  const ref = db
    .collection(BITE_EXPLANATIONS_COLLECTION)
    .doc(explanationId(biteId, language));
  const cached = fromStored(
    (await ref.get()).data() as Partial<StoredBiteExplanation> | undefined,
    dishName,
  );

  if (cached) {
    return cached;
  }

  if (
    !(await takeDailyAllowance(
      db,
      uid,
      'explanations',
      DAILY_EXPLANATION_LIMIT,
    ))
  ) {
    logger.info('explainBite: daily limit reached', { uid });

    return { status: 'limit' };
  }

  const stored = (
    status: 'ok' | 'unknown',
    model: string,
    explanation?: BiteExplanation,
  ): StoredBiteExplanation => ({
    biteId,
    language,
    dishName,
    status,
    model,
    createdAt: new Date().toISOString(),
    ...explanation,
  });

  const stage = resolveDeploymentStage();

  if (stage !== 'production') {
    const explanation = sampleExplanation(
      stage,
      dishName,
      AI_LANGUAGES[language],
    );
    await ref.set(stored('ok', `sample-${stage}`, explanation));

    return { status: 'ok', cached: false, explanation };
  }

  try {
    const answer = await generateWithGemini({
      system: explanationInstructions(AI_LANGUAGES[language]),
      text: explanationInputs({ ...bite, name: dishName }),
      image: await imageFromStoragePath(photoPathOf(bite)),
      responseSchema: {
        type: 'OBJECT',
        properties: {
          status: { type: 'STRING', enum: ['ok', 'unknown'] },
          whatItIs: { type: 'STRING' },
          origin: { type: 'STRING' },
          ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['status'],
      },
      maxOutputTokens: 600,
    });

    logger.info('explainBite: answer written', {
      uid,
      biteId,
      language,
      status: answer.json['status'],
      inputTokens: answer.inputTokens,
      outputTokens: answer.outputTokens,
    });

    if (answer.json['status'] === 'unknown') {
      await ref.set(stored('unknown', GEMINI_MODEL));

      return { status: 'unknown', cached: false };
    }

    const explanation = toExplanation(answer.json);

    if (!explanation) {
      throw new GeminiUnavailableError('Gemini wrote an incomplete answer.');
    }

    await ref.set(stored('ok', GEMINI_MODEL, explanation));

    return { status: 'ok', cached: false, explanation };
  } catch (error) {
    logger.warn('explainBite: no explanation', {
      uid,
      biteId,
      error: error instanceof Error ? error.message : String(error),
    });
    await returnDailyAllowance(db, uid, 'explanations');

    return { status: 'unavailable' };
  }
});

/** Deletes a Bite's explanations in every language. */
export const deleteBiteExplanationsForBite = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const snapshot = await db
    .collection(BITE_EXPLANATIONS_COLLECTION)
    .where('biteId', '==', biteId)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
};
