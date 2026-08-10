export interface Review {
  author: string;
  biteId: string;
  review: string;
  id: string;

  /**
   * The uid behind `author`. Written since reviews were introduced but never
   * declared, and required now that a thread has to be fanned out to the people
   * in it. Optional because reviews written before it exist and stay
   * assignable — they are simply unreachable in the fan-out (issue #1283).
   */
  authorId?: string;

  /**
   * The review this one answers. Absent on a root review, which is what makes a
   * review the start of a thread rather than a message inside one.
   */
  parentReviewId?: string;

  /**
   * The root review of the conversation this one belongs to. Absent on a root
   * review, whose own id is the thread id, so a reply can be grouped without
   * walking the parent chain.
   */
  threadId?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
