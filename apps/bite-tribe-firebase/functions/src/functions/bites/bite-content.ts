import { DocumentData, Firestore } from 'firebase-admin/firestore';
import {
  checkContent,
  ContentField,
  ContentVerdict,
} from '../shared/moderation/check-content';

/**
 * The text of a Bite that other accounts read (issue #1610): its name, its
 * tags and its description. Everything else on a Bite is a choice from a
 * list, a number or a position.
 */
export const BITE_CONTENT_FIELDS = ['name', 'tags', 'description'] as const;

export type BiteContentField = (typeof BITE_CONTENT_FIELDS)[number];

export type BiteContent = Partial<Record<BiteContentField, unknown>>;

const textOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const tagsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string')
    : [];

/** The fields as the check reads them; tags are judged together, as one line. */
export const biteContentFields = (bite: BiteContent): ContentField[] => [
  { field: 'name', value: textOf(bite.name) },
  { field: 'tags', value: tagsOf(bite.tags).join(', ') },
  { field: 'description', value: textOf(bite.description) },
];

/**
 * Whether a write changed what the check reads. Most writes to a Bite do not
 * - like counters, the address, the photo status - and none of those may cost
 * a check, let alone a model call.
 */
export const biteContentChanged = (
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): boolean => {
  if (!after) {
    return false;
  }

  const was = biteContentFields(before ?? {});

  return biteContentFields(after).some(
    ({ value }, index) => value !== was[index].value,
  );
};

export const judgeBiteContent = (
  db: Firestore,
  bite: BiteContent,
): Promise<ContentVerdict> => checkContent(db, biteContentFields(bite));

/** The refused text in one line, for the refusal record. */
export const biteContentText = (bite: BiteContent): string =>
  biteContentFields(bite)
    .map(({ value }) => value)
    .filter(Boolean)
    .join(' | ');
