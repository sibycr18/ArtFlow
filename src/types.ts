export interface File {
  id: string;
  name: string;
  type: 'canvas' | 'image' | 'document';
  lastModified: string;
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  files: File[];
}
