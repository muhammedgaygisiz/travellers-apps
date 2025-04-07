import { FileNode } from '@travellers-apps/kosaml/model/feature';

export interface SiteState {
  isProjectBarOpen: boolean;
  isToolBarOpen: boolean;
  loading: boolean;
  projectStructure: FileNode[];
  sidebarWidth: string;
}
