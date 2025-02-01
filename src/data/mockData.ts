import { Project } from '../types';

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Brand Design 2024',
    lastModified: '2h ago',
    files: [
      { id: 'f1', name: 'Logo Sketches', type: 'canvas', lastModified: '2h ago' },
      { id: 'f2', name: 'Brand Guidelines', type: 'document', lastModified: '3h ago' },
      { id: 'f3', name: 'Logo Export', type: 'image', lastModified: '3h ago' },
    ]
  },
  {
    id: 'p2',
    name: 'Website Redesign',
    lastModified: '1d ago',
    files: [
      { id: 'f4', name: 'Homepage Wireframe', type: 'canvas', lastModified: '1d ago' },
      { id: 'f5', name: 'Design System', type: 'document', lastModified: '2d ago' },
      { id: 'f6', name: 'Asset Library', type: 'image', lastModified: '2d ago' },
    ]
  },
  {
    id: 'p3',
    name: 'Mobile App Design',
    lastModified: '2d ago',
    files: [
      { id: 'f7', name: 'App Flows', type: 'canvas', lastModified: '2d ago' },
      { id: 'f8', name: 'UI Components', type: 'canvas', lastModified: '3d ago' },
      { id: 'f9', name: 'Requirements', type: 'document', lastModified: '3d ago' },
    ]
  }
];