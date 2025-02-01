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