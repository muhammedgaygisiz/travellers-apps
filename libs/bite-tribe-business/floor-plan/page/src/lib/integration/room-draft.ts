import { Millimetres } from 'model';

/**
 * A room as the form has it: a name and two sides, already in millimetres.
 *
 * The conversion from the metres an owner types happens in the form component,
 * through `metresToMillimetres`, so nothing downstream of here has to know that
 * a human ever said "eight by twelve". See the reasoning in
 * `libs/bite-tribe-business/floor-plan/ui/src/lib/floor-plan-units.ts`.
 *
 * It carries no `id`, no `order`, no `objects` and no `version`: those belong
 * to the room the draft is applied to, or to the service that creates one, and
 * a form that could set them could also overwrite them.
 */
export interface RoomDraft {
  name: string;
  width: Millimetres;
  height: Millimetres;
  /**
   * The level the room sits on, absent when the owner named none.
   *
   * A cleared field arrives as `undefined` rather than as an empty string, so
   * "this room is on no named floor" is one value on the way to Firestore
   * instead of two (issue #1085).
   */
  floor?: string;
}
