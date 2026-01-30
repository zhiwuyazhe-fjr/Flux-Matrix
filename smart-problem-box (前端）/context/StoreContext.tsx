
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef } from 'react';
import { AppState, Problem, TreeNode, ViewMode, UserProfile } from '../types';
import {
  apiAddFolder,
  apiBootstrap,
  apiDeleteNode,
  apiDeleteNodesBatch,
  apiDeleteProblem,
  apiDeleteProblemsBatch,
  apiHardDeleteNode,
  apiLogin,
  apiRegister,
  apiRestoreNode,
  apiToggleFavorite,
  apiUpdateProfile,
  apiMoveProblemToFolder,
  apiMoveNodeToFolder,
  apiReorderNodes,
  clearAccessToken,
  getAccessToken,
  setAccessToken
} from '../api';

interface StoreContextType {
  state: AppState;
  problems: Record<string, Problem>;
  treeData: TreeNode[];
  filteredProblems: Problem[]; // Exposed filtered list
  toggleFavorite: (problemId: string) => void;
  setCurrentProblem: (problemId: string) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleNodeExpansion: (nodeId: string) => void;
  setExpandedNodes: (nodeIds: string[]) => void;
  toggleDarkMode: () => void;
  toggleFullscreen: () => void;
  toggleSidebar: () => void;
  setColumnWidth: (column: 'sidebar' | 'middle', width: number) => void;
  setDifficultyFilter: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void;
  addNewFolder: (title: string) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodesBatch: (nodeIds: string[]) => void;
  deleteProblem: (problemId: string) => void;
  deleteProblemsBatch: (problemIds: string[]) => void;
  restoreNode: (nodeId: string) => void;
  hardDeleteNode: (nodeId: string) => void;
  moveProblemToFolder: (problemId: string, targetFolderId?: string | null) => void;
  moveNodeToFolder: (nodeId: string, targetFolderId?: string | null) => void;
  reorderNodesInParent: (parentId: string | null, orderedIds: string[]) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper to find a node by ID in the tree
const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to recursively collect all problem IDs under a node
const collectProblemIds = (node: TreeNode): string[] => {
  let ids: string[] = [];
  if (node.type === 'file' && node.problemId) {
    ids.push(node.problemId);
  }
  if (node.children) {
    node.children.forEach(child => {
      ids = ids.concat(collectProblemIds(child));
    });
  }
  return ids;
};

const reorderChildrenByIds = (children: TreeNode[], orderedIds: string[]) => {
  const map = new Map(children.map((child) => [child.id, child]));
  const ordered = orderedIds.map((id) => map.get(id)).filter(Boolean) as TreeNode[];
  const remaining = children.filter((child) => !orderedIds.includes(child.id));
  return [...ordered, ...remaining];
};

const reorderTreeByParent = (nodes: TreeNode[], parentId: string | null, orderedIds: string[]): TreeNode[] => {
  if (!parentId) {
    return reorderChildrenByIds(nodes, orderedIds);
  }
  return nodes.map((node) => {
    if (node.id === parentId) {
      const nextChildren = node.children ? reorderChildrenByIds(node.children, orderedIds) : node.children;
      return { ...node, children: nextChildren };
    }
    if (node.children) {
      return { ...node, children: reorderTreeByParent(node.children, parentId, orderedIds) };
    }
    return node;
  });
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    isLoggedIn: false, // Default to false to show Login Screen
    user: {
        name: '李明',
        email: 'liming@example.com',
        plan: 'free'
    },
    currentView: 'landing',
    currentProblemId: null,
    selectedFolderId: null, // Default to null (show all or root)
    favorites: [],
    expandedNodes: ['root-1', 'ch-1-1'],
    darkMode: true,
    isFullscreen: false,
    isSidebarOpen: true,
    sidebarWidth: 256, // 16rem default
    middleColumnWidth: 384, // 24rem default
    difficultyFilter: 'all',
  });

  const [problems, setProblems] = useState<Record<string, Problem>>({});
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const prevSidebarOpenRef = useRef<boolean | null>(null);

  const loadRemoteData = async () => {
    const data = await apiBootstrap();
    const problemsMap = data.problems.reduce<Record<string, Problem>>((acc, problem) => {
      acc[problem.id] = problem;
      return acc;
    }, {});

    setProblems(problemsMap);
    setTreeData(data.tree || []);
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      user: data.profile,
      favorites: data.favorites || [],
      currentProblemId: data.problems[0]?.id ?? null
    }));
  };

  const refreshData = async () => {
    const data = await apiBootstrap();
    const problemsMap = data.problems.reduce<Record<string, Problem>>((acc, problem) => {
      acc[problem.id] = problem;
      return acc;
    }, {});

    setProblems(problemsMap);
    setTreeData(data.tree || []);
    setState(prev => ({
      ...prev,
      favorites: data.favorites || [],
      currentProblemId: prev.currentProblemId && problemsMap[prev.currentProblemId]
        ? prev.currentProblemId
        : data.problems[0]?.id ?? null
    }));
  };

  // Sync dark mode with HTML class
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    loadRemoteData().catch(() => {
      clearAccessToken();
      setState(prev => ({ ...prev, isLoggedIn: false }));
    });
  }, []);

  // Compute filtered problems based on selectedFolderId and difficultyFilter
  const filteredProblems = useMemo(() => {
    let result: Problem[] = [];

    // 1. Filter by Folder
    if (!state.selectedFolderId) {
      // If no folder selected, show all problems
      result = Object.values(problems);
    } else {
      const selectedNode = findNode(treeData, state.selectedFolderId);
      if (!selectedNode) {
          result = [];
      } else {
          const ids = collectProblemIds(selectedNode);
          result = ids.map(id => problems[id]).filter(Boolean);
      }
    }

    // 2. Filter by Difficulty
    if (state.difficultyFilter !== 'all') {
        result = result.filter(p => p.difficulty === state.difficultyFilter);
    }

    return result;
  }, [state.selectedFolderId, state.difficultyFilter, problems, treeData]);

  const toggleFavorite = (problemId: string) => {
    apiToggleFavorite(problemId)
      .then(({ favorites }) => {
        setState(prev => ({ ...prev, favorites }));
      })
      .catch((error) => {
        console.error('切换收藏失败：', error);
      });
  };

  const setCurrentProblem = (problemId: string) => {
    setState((prev) => ({ ...prev, currentProblemId: problemId }));
  };

  const setSelectedFolder = (folderId: string | null) => {
    setState((prev) => ({ ...prev, selectedFolderId: folderId }));
  };

  const setViewMode = (mode: ViewMode) => {
    setState((prev) => ({ ...prev, currentView: mode }));
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setState((prev) => {
      const isExpanded = prev.expandedNodes.includes(nodeId);
      return {
        ...prev,
        expandedNodes: isExpanded
          ? prev.expandedNodes.filter((id) => id !== nodeId)
          : [...prev.expandedNodes, nodeId],
      };
    });
  };

  const setExpandedNodes = (nodeIds: string[]) => {
    setState((prev) => ({
      ...prev,
      expandedNodes: Array.from(new Set(nodeIds))
    }));
  };

  const toggleDarkMode = () => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const toggleFullscreen = () => {
    setState(prev => {
      const nextFullscreen = !prev.isFullscreen;
      if (nextFullscreen) {
        prevSidebarOpenRef.current = prev.isSidebarOpen;
      }
      return {
        ...prev,
        isFullscreen: nextFullscreen,
        isSidebarOpen: nextFullscreen ? false : (prevSidebarOpenRef.current ?? true)
      };
    });
  }

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }));
  };

  const setColumnWidth = (column: 'sidebar' | 'middle', width: number) => {
    setState(prev => ({
        ...prev,
        [column === 'sidebar' ? 'sidebarWidth' : 'middleColumnWidth']: width
    }));
  };

  const setDifficultyFilter = (difficulty: 'all' | 'easy' | 'medium' | 'hard') => {
      setState(prev => ({ ...prev, difficultyFilter: difficulty }));
  };

  const addNewFolder = (title: string) => {
    apiAddFolder({ title })
      .then(({ node }) => {
        setTreeData(prev => [...prev, node]);
      })
      .catch((error) => {
        console.error('新建文件夹失败：', error);
      });
  };

  const pruneTreeByProblemIds = (nodes: TreeNode[], ids: Set<string>): TreeNode[] => {
    return nodes
      .filter((node) => !(node.type === 'file' && node.problemId && ids.has(node.problemId)))
      .map((node) => ({
        ...node,
        children: node.children ? pruneTreeByProblemIds(node.children, ids) : node.children
      }));
  };

  const findTrashFolderId = (nodes: TreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === 'folder' && node.title === '回收站') return node.id;
      if (node.children) {
        const found = findTrashFolderId(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const moveNodeInTree = (nodes: TreeNode[], nodeId: string, targetFolderId?: string | null): TreeNode[] => {
    let removed: TreeNode | null = null;
    const detach = (items: TreeNode[]): TreeNode[] => items
      .filter((item) => {
        if (item.id === nodeId) {
          removed = item;
          return false;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        children: item.children ? detach(item.children) : item.children
      }));

    const insert = (items: TreeNode[]): TreeNode[] => {
      if (!removed) return items;
      if (!targetFolderId) {
        return [...items, { ...removed, parent_id: null }];
      }
      return items.map((item) => {
        if (item.type === 'folder' && item.id === targetFolderId) {
          const nextChildren = item.children ? [...item.children, removed!] : [removed!];
          return { ...item, children: nextChildren };
        }
        if (item.children) {
          return { ...item, children: insert(item.children) };
        }
        return item;
      });
    };

    const detached = detach(nodes);
    return insert(detached);
  };

  const moveProblemInTree = (nodes: TreeNode[], problemId: string, targetFolderId?: string | null): TreeNode[] => {
    let removed: TreeNode | null = null;
    const detach = (items: TreeNode[]): TreeNode[] => items
      .filter((item) => {
        if (item.type === 'file' && item.problemId === problemId) {
          removed = item;
          return false;
        }
        return true;
      })
      .map((item) => ({
        ...item,
        children: item.children ? detach(item.children) : item.children
      }));

    const insert = (items: TreeNode[]): TreeNode[] => {
      if (!removed) return items;
      if (!targetFolderId) {
        return [...items, { ...removed, parent_id: null }];
      }
      return items.map((item) => {
        if (item.type === 'folder' && item.id === targetFolderId) {
          const nextChildren = item.children ? [...item.children, removed!] : [removed!];
          return { ...item, children: nextChildren };
        }
        if (item.children) {
          return { ...item, children: insert(item.children) };
        }
        return item;
      });
    };

    const detached = detach(nodes);
    return insert(detached);
  };

  const applyLocalProblemRemoval = (problemIds: string[]) => {
    const idSet = new Set(problemIds);
    setProblems(prev => {
      const next = { ...prev };
      problemIds.forEach((id) => {
        delete next[id];
      });
      const remainingIds = Object.keys(next);
      setState(prevState => {
        const nextCurrent = prevState.currentProblemId && idSet.has(prevState.currentProblemId)
          ? (remainingIds[0] || null)
          : prevState.currentProblemId;
        return {
          ...prevState,
          favorites: prevState.favorites.filter((id) => !idSet.has(id)),
          currentProblemId: nextCurrent
        };
      });
      return next;
    });
    setTreeData(prev => pruneTreeByProblemIds(prev, idSet));
  };

  const deleteNode = (nodeId: string) => {
    setTreeData((prev) => {
      const trashId = findTrashFolderId(prev);
      return moveNodeInTree(prev, nodeId, trashId);
    });
    apiDeleteNode(nodeId)
      .catch((error) => {
        refreshData();
        console.error('删除节点失败：', error);
      });
  };

  const deleteNodesBatch = (nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    setTreeData((prev) => {
      const trashId = findTrashFolderId(prev);
      return nodeIds.reduce((acc, id) => moveNodeInTree(acc, id, trashId), prev);
    });
    apiDeleteNodesBatch(nodeIds)
      .catch((error) => {
        refreshData();
        console.error('批量删除节点失败：', error);
      });
  };

  const deleteProblem = (problemId: string) => {
    applyLocalProblemRemoval([problemId]);
    apiDeleteProblem(problemId)
      .catch((error) => {
        refreshData();
        console.error('删除题目失败：', error);
      });
  };

  const deleteProblemsBatch = (problemIds: string[]) => {
    if (problemIds.length === 0) return;
    applyLocalProblemRemoval(problemIds);
    apiDeleteProblemsBatch(problemIds)
      .catch((error) => {
        refreshData();
        console.error('批量删除题目失败：', error);
      });
  };

  const restoreNode = (nodeId: string) => {
    apiRestoreNode({ nodeId })
      .then(() => {
        refreshData();
      })
      .catch((error) => {
        console.error('还原失败：', error);
      });
  };

  const hardDeleteNode = (nodeId: string) => {
    apiHardDeleteNode({ nodeId })
      .then(() => {
        refreshData();
      })
      .catch((error) => {
        console.error('彻底删除失败：', error);
      });
  };

  const moveProblemToFolder = (problemId: string, targetFolderId?: string | null) => {
    setTreeData(prev => moveProblemInTree(prev, problemId, targetFolderId));
    apiMoveProblemToFolder({ problemId, targetFolderId })
      .catch((error) => {
        refreshData();
        console.error('移动题目失败：', error);
      });
  };

  const moveNodeToFolder = (nodeId: string, targetFolderId?: string | null) => {
    setTreeData(prev => moveNodeInTree(prev, nodeId, targetFolderId));
    apiMoveNodeToFolder({ nodeId, targetFolderId })
      .catch((error) => {
        refreshData();
        console.error('移动节点失败：', error);
      });
  };

  const reorderNodesInParent = (parentId: string | null, orderedIds: string[]) => {
    if (!orderedIds || orderedIds.length === 0) return;
    setTreeData(prev => reorderTreeByParent(prev, parentId, orderedIds));
    apiReorderNodes({ orderedIds })
      .catch((error) => {
        refreshData();
        console.error('排序失败：', error);
      });
  };
  // Auth Methods
  const login = async (email: string, password: string) => {
    const { token, profile } = await apiLogin({ email, password });
    setAccessToken(token);
    setState(prev => ({ ...prev, isLoggedIn: true, user: profile }));
    await loadRemoteData();
  };

  const register = async (name: string, email: string, password: string) => {
    const { token, profile } = await apiRegister({ name, email, password });
    setAccessToken(token);
    setState(prev => ({ ...prev, isLoggedIn: true, user: profile }));
    await loadRemoteData();
  };

  const logout = () => {
    clearAccessToken();
    setProblems({});
    setTreeData([]);
    setState(prev => ({
      ...prev,
      isLoggedIn: false,
      favorites: [],
      currentProblemId: null,
      currentView: 'study'
    }));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, ...profile }
    }));
    apiUpdateProfile(profile)
      .then(({ profile: nextProfile }) => {
        setState(prev => ({
          ...prev,
          user: { ...prev.user, ...nextProfile }
        }));
      })
      .catch((error) => {
        console.error('更新用户信息失败：', error);
      });
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        problems,
        treeData,
        filteredProblems,
        toggleFavorite,
        setCurrentProblem,
        setSelectedFolder,
        setViewMode,
        toggleNodeExpansion,
        setExpandedNodes,
        toggleDarkMode,
        toggleFullscreen,
        toggleSidebar,
        setColumnWidth,
        setDifficultyFilter,
        addNewFolder,
        deleteNode,
        deleteNodesBatch,
        deleteProblem,
        deleteProblemsBatch,
        restoreNode,
        hardDeleteNode,
        moveProblemToFolder,
        moveNodeToFolder,
        reorderNodesInParent,
        login,
        register,
        logout,
        updateUserProfile,
        refreshData
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
