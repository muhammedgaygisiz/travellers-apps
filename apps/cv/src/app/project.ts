export interface Project {
  id: number;
  from: Date;
  to: Date;

  exclude?: boolean;

  company: string;
  role: string;
  description: string;

  paragraph?: string[];
}
