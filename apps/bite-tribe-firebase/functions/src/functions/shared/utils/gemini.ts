import { GoogleAuth } from 'google-auth-library';

/**
 * The model behind the AI features (issue #2030): Gemini's cheap tier on
 * Vertex AI, picked on the Cusco samples recorded on the issue. Called on the
 * global endpoint, the one priced lowest.
 */
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/**
 * The output limit of a one-word verdict, such as a moderation category.
 *
 * The answer itself is about a dozen tokens, but the model spends part of
 * the limit before it writes any: at 20 it stopped at `{"` with
 * `MAX_TOKENS` on every call, so every check came back unavailable (issue
 * #2143). 256 leaves room for that and still caps a runaway answer.
 */
export const VERDICT_MAX_OUTPUT_TOKENS = 256;

/** One image passed to the model, base64-encoded. */
export interface GeminiImage {
  mimeType: string;
  data: string;
}

export interface GeminiRequest {
  system: string;
  text: string;
  image?: GeminiImage;
  /** The JSON schema the answer must follow (Vertex `responseSchema`). */
  responseSchema: Record<string, unknown>;
  maxOutputTokens: number;
  /**
   * How long the call may take before it is abandoned as unavailable. Unset,
   * the call waits as long as the function does.
   */
  timeoutMs?: number;
}

export interface GeminiResponse {
  /** The model's answer, parsed from the JSON the schema asks for. */
  json: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
}

/** A call that did not produce an answer: the model, quota or network. */
export class GeminiUnavailableError extends Error {}

const auth = new GoogleAuth({ scopes: SCOPE });

const projectId = (): string => {
  const project = process.env['GCLOUD_PROJECT'] ?? process.env['GCP_PROJECT'];

  if (!project) {
    throw new GeminiUnavailableError('No Google Cloud project is set.');
  }

  return project;
};

/**
 * Asks Gemini on Vertex AI for a structured answer.
 *
 * The function authenticates as its own service account through Application
 * Default Credentials, so there is no API key to store, rotate or leak, and
 * the calls are billed on the project's Blaze account. Paid Vertex usage is
 * not used to train Google's models (issue #2030).
 */
export const generateWithGemini = async (
  request: GeminiRequest,
): Promise<GeminiResponse> => {
  const token = await auth.getAccessToken();
  const url =
    `https://aiplatform.googleapis.com/v1/projects/${projectId()}` +
    `/locations/global/publishers/google/models/${GEMINI_MODEL}:generateContent`;

  const parts: Record<string, unknown>[] = [];

  if (request.image) {
    parts.push({ inlineData: request.image });
  }

  parts.push({ text: request.text });

  const response = await fetch(url, {
    method: 'POST',
    signal:
      request.timeoutMs === undefined
        ? undefined
        : AbortSignal.timeout(request.timeoutMs),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: request.responseSchema,
        maxOutputTokens: request.maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new GeminiUnavailableError(
      `Gemini answered ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new GeminiUnavailableError(
      `Gemini stopped at the output limit of ${request.maxOutputTokens} tokens.`,
    );
  }

  if (!text) {
    throw new GeminiUnavailableError('Gemini returned no text.');
  }

  try {
    return {
      json: JSON.parse(text) as Record<string, unknown>,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    };
  } catch {
    throw new GeminiUnavailableError('Gemini returned text that is not JSON.');
  }
};
