
import type { AnalysisResult } from './types/analysis';

export type ViewMode = 'landing' | 'study' | 'practice' | 'feedback' | 'import' | 'settings' | 'upgrade' | 'help' | 'forgot_password' | 'register';

export interface Problem {
  id: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeAgo: string;
  createdAt?: string;
  analysisResult?: AnalysisResult | null;
  tags: string[];
  description?: string; // HTML or Markdown content
  isFavorite?: boolean;
}

export type TreeNodeType = 'folder' | 'file';

export interface TreeNode {
  id: string;
  title: string;
  type: TreeNodeType;
  children?: TreeNode[];
  problemId?: string; // If type is file
  expanded?: boolean; // UI state
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro';
}

export interface AppState {
  isLoggedIn: boolean;
  user: UserProfile;
  currentView: ViewMode;
  currentProblemId: string | null;
  selectedFolderId: string | null; // ID of the currently selected folder for filtering
  favorites: string[]; // List of Problem IDs
  expandedNodes: string[]; // List of expanded DirectoryNode IDs
  darkMode: boolean;
  isFullscreen: boolean; // UI State for maximizing the right column
  isSidebarOpen: boolean;
  sidebarWidth: number;
  middleColumnWidth: number;
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard';
}
