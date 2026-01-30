
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import DirectoryTree from './DirectoryTree';
import { Bookmark, Settings, User, Plus, LogOut, CreditCard, HelpCircle, Trash2, ListChecks, X, RotateCcw, Folder, FileText, ChevronDown } from 'lucide-react';
import { TreeNode } from '../../types';

const Sidebar: React.FC = () => {
  const { state, problems, setCurrentProblem, treeData, setViewMode, logout, deleteNodesBatch, restoreNode, hardDeleteNode } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [recycleSelectedIds, setRecycleSelectedIds] = useState<string[]>([]);
  const [isRecycleSelectMode, setIsRecycleSelectMode] = useState(false);
  const [isRecycleExpanded, setIsRecycleExpanded] = useState(false);

  const favoriteProblems = state.favorites
    .map((id) => problems[id])
    .filter(Boolean); // Filter out undefined if id doesn't exist

  const recycleNode = useMemo(() => treeData.find(node => node.title === '回收站'), [treeData]);
  const treeWithoutRecycle = useMemo(() => {
    if (!recycleNode) return treeData;
    return treeData.filter(node => node.id !== recycleNode.id && node.title !== '回收站');
  }, [treeData, recycleNode]);

  const collectRecycleIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    nodes.forEach((node) => {
      ids.push(node.id);
      if (node.children?.length) ids.push(...collectRecycleIds(node.children));
    });
    return ids;
  };

  const toggleRecycleSelect = (nodeId: string) => {
    setRecycleSelectedIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleRecycleBatchDelete = async () => {
    if (recycleSelectedIds.length === 0) return;
    await Promise.all(recycleSelectedIds.map((id) => hardDeleteNode(id)));
    setRecycleSelectedIds([]);
  };

  const toggleRecycleSelectMode = () => {
    setIsRecycleSelectMode((prev) => {
      const next = !prev;
      if (!next) setRecycleSelectedIds([]);
      return next;
    });
  };

  const renderRecycleNodes = (nodes: TreeNode[], level = 0) => {
    if (!nodes || nodes.length === 0) return null;
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1.5 pr-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg mx-2"
          style={{ paddingLeft: `${16 + level * 12}px` }}
        >
          {isRecycleSelectMode && (
            <input
              type="checkbox"
              checked={recycleSelectedIds.includes(node.id)}
              onChange={() => toggleRecycleSelect(node.id)}
              className="h-3 w-3 accent-primary"
            />
          )}
          <span className="flex-none opacity-70">
            {node.type === 'folder' ? <Folder size={16} /> : <FileText size={16} />}
          </span>
          <span className="flex-1 truncate">{node.title}</span>
          <button
            onClick={() => restoreNode(node.id)}
            className="text-[10px] px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/60 dark:border-emerald-600/40 dark:text-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 flex items-center gap-1"
            title="还原"
          >
            <RotateCcw size={12} />
            还原
          </button>
          <button
            onClick={() => hardDeleteNode(node.id)}
            className="text-[10px] px-2 py-1 rounded-md border border-red-200 text-red-600 bg-red-50/60 hover:bg-red-100/60 dark:border-red-600/40 dark:text-red-300 dark:bg-red-500/15 dark:hover:bg-red-500/25 flex items-center gap-1"
            title="彻底删除"
          >
            <Trash2 size={12} />
            彻底删除
          </button>
        </div>
        {node.type === 'folder' && node.children && renderRecycleNodes(node.children, level + 1)}
      </div>
    ));
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
      action();
      setIsSettingsOpen(false);
  };

  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    const traverse = (nodes: any[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node);
        if (node.children) traverse(node.children);
      });
    };
    traverse(treeData);
    return map;
  }, [treeData]);

  const collectDescendantIds = (nodeId: string): string[] => {
    const node = nodeMap.get(nodeId);
    if (!node) return [];
    const ids: string[] = [node.id];
    if (node.children) {
      node.children.forEach((child: any) => {
        ids.push(...collectDescendantIds(child.id));
      });
    }
    return ids;
  };

  const toggleSelectNode = (node: any) => {
    const idsToToggle = node.type === 'folder' ? collectDescendantIds(node.id) : [node.id];
    setSelectedNodeIds(prev => {
      const isSelected = idsToToggle.every(id => prev.includes(id));
      if (isSelected) {
        return prev.filter(id => !idsToToggle.includes(id));
      }
      return Array.from(new Set([...prev, ...idsToToggle]));
    });
  };

  const clearSelection = () => setSelectedNodeIds([]);

  const handleBatchDelete = () => {
    if (selectedNodeIds.length === 0) return;
    deleteNodesBatch(selectedNodeIds);
    clearSelection();
  };

  const toggleSelectMode = () => {
    setIsSelectMode(prev => {
      const next = !prev;
      if (!next) clearSelection();
      return next;
    });
  };

  return (
    <aside 
        className="flex-none flux-panel border-r flux-divider flex flex-col z-20 h-screen"
        style={{ width: state.sidebarWidth }}
    >
      {/* App Header */}
      <div className="h-16 flex-none flex items-center px-5 border-b flux-divider">
        <img
          src="/flux-logo.png"
          alt="Flux Matrix logo"
          className="mr-2 h-7 w-7 rounded-md object-contain"
        />
        <h1 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-[#E0E0E0] truncate">Flux Matrix</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 scrollbar-hide">
        
        {/* Section 1: Favorites */}
        <div className="flex flex-col gap-1">
          <p className="px-5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2">收藏夹</p>
          {favoriteProblems.length === 0 ? (
             <div className="px-5 text-sm text-zinc-800 dark:text-zinc-200 italic">暂无收藏</div>
          ) : (
            favoriteProblems.map((problem) => (
              <button
                key={`fav-${problem.id}`}
                onClick={() => {
                    setCurrentProblem(problem.id);
                    setViewMode('study'); // Ensure view switches to study
                }}
                className="flex items-center gap-3 px-5 py-2 mx-2 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors group text-left"
              >
                <Bookmark size={18} className="group-hover:text-primary fill-current opacity-70 flex-none" />
                <span className="text-sm font-medium group-hover:text-zinc-900 dark:group-hover:text-white truncate">
                  {problem.title}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Section 2: Directory Tree */}
        <div className="flex flex-col gap-1">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">题库</p>
            <div className="flex items-center gap-2">
              {isSelectMode && (
                <>
                  <span className="text-[10px] text-zinc-500">已选 {selectedNodeIds.length}</span>
                  <button
                    onClick={handleBatchDelete}
                    className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded border ${
                      selectedNodeIds.length === 0
                        ? 'text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                        : 'text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10'
                    }`}
                  >
                    <Trash2 size={12} />
                    批量删除
                  </button>
                </>
              )}
              <button
                onClick={toggleSelectMode}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                title={isSelectMode ? '退出多选' : '多选'}
              >
                {isSelectMode ? <X size={14} /> : <ListChecks size={14} />}
              </button>
            </div>
          </div>
          <DirectoryTree
            nodes={treeWithoutRecycle}
            selectedNodeIds={selectedNodeIds}
            onToggleSelect={toggleSelectNode}
            selectMode={isSelectMode}
          />
        </div>

        {/* Section 3: Recycle Bin */}
        <div className="flex flex-col gap-1">
          <div className="px-5 flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Trash2 size={14} className="text-zinc-800 dark:text-zinc-200" />
              回收站
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecycleExpanded((prev) => !prev)}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                title={isRecycleExpanded ? '收起' : '展开'}
              >
                <ChevronDown size={14} className={`transition-transform ${isRecycleExpanded ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {isRecycleSelectMode && (
                <>
                  <button
                    onClick={() => {
                      if (!recycleNode?.children?.length) return;
                      const allIds = collectRecycleIds(recycleNode.children);
                      if (recycleSelectedIds.length === allIds.length) {
                        setRecycleSelectedIds([]);
                      } else {
                        setRecycleSelectedIds(allIds);
                      }
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded"
                  >
                    {recycleSelectedIds.length === (recycleNode?.children?.length ? collectRecycleIds(recycleNode.children).length : 0)
                      ? '取消全选'
                      : '全选'}
                  </button>
                  <button
                    onClick={handleRecycleBatchDelete}
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      recycleSelectedIds.length === 0
                        ? 'text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                        : 'text-red-600 border-red-200 bg-red-50/60 hover:bg-red-100/60 dark:border-red-600/40 dark:text-red-300 dark:bg-red-500/15 dark:hover:bg-red-500/25'
                    }`}
                  >
                    批量彻底删除
                  </button>
                </>
              )}
              <button
                onClick={toggleRecycleSelectMode}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                title={isRecycleSelectMode ? '退出多选' : '多选'}
              >
                {isRecycleSelectMode ? <X size={14} /> : <ListChecks size={14} />}
              </button>
            </div>
          </div>
          {isRecycleExpanded ? (
            recycleNode?.children?.length
              ? renderRecycleNodes(recycleNode.children)
              : <div className="px-5 text-sm text-zinc-800 dark:text-zinc-200 italic">暂无内容</div>
          ) : (
            <div className="px-5 text-xs text-zinc-800 dark:text-zinc-200 italic">已收起</div>
          )}
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 relative flex flex-col gap-4" ref={settingsRef}>
        <button 
            onClick={() => setViewMode('import')}
            className={`w-full h-10 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all font-medium text-sm group overflow-hidden ${
                state.currentView === 'import'
                ? 'bg-primary text-white shadow-primary/20'
                : 'bg-primary/90 text-white border border-primary/60 hover:bg-primary shadow-lg shadow-primary/30'
            } ${state.currentView !== 'import' ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 animate-pulse' : ''}`}
        >
          <Plus size={20} className="flex-none" />
          <span className="truncate">导入题目</span>
        </button>

        {/* Settings Popup Menu */}
        {isSettingsOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-fade-in z-50 flex flex-col py-1">
                <button 
                    onClick={() => handleMenuClick(() => setViewMode('settings'))}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                    <User size={16} className="text-zinc-400" />
                    账号设置
                </button>
                <button 
                    onClick={() => handleMenuClick(() => setViewMode('upgrade'))}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                    <CreditCard size={16} className="text-zinc-400" />
                    升级专业版
                </button>
                <button 
                    onClick={() => handleMenuClick(() => setViewMode('help'))}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                    <HelpCircle size={16} className="text-zinc-400" />
                    帮助中心
                </button>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                <button 
                    onClick={() => handleMenuClick(logout)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                >
                    <LogOut size={16} />
                    退出登录
                </button>
            </div>
        )}

        <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors overflow-hidden ${isSettingsOpen ? 'bg-zinc-200 dark:bg-zinc-900' : 'hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
        >
          {state.user.avatar ? (
              <img src={state.user.avatar} alt="Avatar" className="h-8 w-8 rounded-full object-cover shadow-sm flex-none" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white flex-none font-bold text-sm">
                {state.user.name.charAt(0)}
            </div>
          )}
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white leading-none truncate">{state.user.name}</p>
            <p className="text-xs text-zinc-500 mt-1 truncate">{state.user.plan === 'free' ? '免费版' : '专业版'}</p>
          </div>
          <Settings size={20} className={`text-zinc-400 flex-none transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-primary' : ''}`} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
