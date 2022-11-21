/** File node data with possible child nodes. */
export interface FileNode {
  name: string;
  type: string;
  children?: FileNode[];
  link?: string;
}

export interface SiteState {
  isProjectBarOpen: boolean;
  isToolBarOpen: boolean;
  loading: boolean;
  projectStructure: FileNode[];
  sidebarWidth: string;
}
