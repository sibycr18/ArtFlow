// Frontend file types that match what our UI expects
export type UIFileType = 'canvas' | 'image' | 'document';

export interface File {
  id: string;
  name: string;
  type: UIFileType;
  lastModified: string;
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  files: File[];
}

export interface ExploreItem {
  id: string;
  title: string;
  type: 'canvas' | 'image';
  thumbnail: string;
  author: {
    name: string;
    avatar: string;
  };
  likes: number;
  views: number;
}