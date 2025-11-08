export interface Project {
  id: number;
  from: Date;
  to: Date;

  exclude?: boolean;

  technologies?: { [key: string]: number };

  company: string;
  role: string;
  description: string;

  paragraph?: string[];
}
