export type { IntroFlowVariant } from './flow-scripts';
export {
  FIND_THE_BITE_FLOWS,
  SHARE_THE_FIND_FLOWS,
  ALL_INTRO_FLOWS,
  INTRO_FLOW_BY_ID,
} from './flow-scripts';
export {
  JOIN_THE_TRIBE_FLOWS,
  READY_TO_TASTE_FLOWS,
  TRIBE_GO_FLOWS,
  TRIBE_GO_FLOW_BY_ID,
} from './tribe-go-flows';

import { ALL_INTRO_FLOWS, INTRO_FLOW_BY_ID } from './flow-scripts';
import { TRIBE_GO_FLOWS, TRIBE_GO_FLOW_BY_ID } from './tribe-go-flows';
import type { IntroFlowVariant } from './flow-scripts';

export const ALL_STORY_FLOWS: IntroFlowVariant[] = [
  ...ALL_INTRO_FLOWS,
  ...TRIBE_GO_FLOWS,
];

export const STORY_FLOW_BY_ID: Record<string, IntroFlowVariant> = {
  ...INTRO_FLOW_BY_ID,
  ...TRIBE_GO_FLOW_BY_ID,
};
