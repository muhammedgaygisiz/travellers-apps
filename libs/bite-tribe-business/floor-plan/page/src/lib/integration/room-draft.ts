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
}
