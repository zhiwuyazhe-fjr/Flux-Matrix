
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Search, Filter, FolderOpen, PanelLeft, Check, Trash2, ListChecks, X } from 'lucide-react';

const ProblemList: React.FC = () => {
  const { filteredProblems, state, treeData, setCurrentProblem, setViewMode, toggleSidebar, setDifficultyFilter, deleteProblem, deleteProblemsBatch, reorderNodesInParent } = useStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; problemId: string } | null>(null);

  // Close filter/menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      setContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => filteredProblems.some(p => p.id === id)));
  }, [filteredProblems]);

  const toggleSelect = (problemId: string) => {
    setSelectedIds(prev => (
      prev.includes(problemId) ? prev.filter(id => id !== problemId) : [...prev, problemId]
    ));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProblems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProblems.map(p => p.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    deleteProblemsBatch(selectedIds);
    setSelectedIds([]);
  };

  const toggleSelectMode = () => {
    setIsSelectMode(prev => {
      const next = !prev;
      if (!next) setSelectedIds([]);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, problemId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, problemId });
  };

  const findFolderNode = (nodes: any[], id: string): any | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFolderNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const reorderProblemWithinFolder = (fromProblemId: string, toProblemId: string) => {
    if (!state.selectedFolderId) return;
    const folderNode = findFolderNode(treeData, state.selectedFolderId);
    if (!folderNode || !folderNode.children) return;
    const fileNodes = folderNode.children.filter((n: any) => n.type === 'file' && n.problemId);
    const fromNode = fileNodes.find((n: any) => n.problemId === fromProblemId);
    const toNode = fileNodes.find((n: any) => n.problemId === toProblemId);
    if (!fromNode || !toNode) return;
    const ids = fileNodes.map((n: any) => n.id);
    const next = ids.filter((id: string) => id !== fromNode.id);
    const targetIndex = next.indexOf(toNode.id);
    if (targetIndex === -1) return;
    next.splice(targetIndex, 0, fromNode.id);
    reorderNodesInParent(state.selectedFolderId, next);
  };

  const difficultyOptions: { value: 'all' | 'easy' | 'medium' | 'hard', label: string, color: string }[] = [
      { value: 'all', label: '全部', color: 'text-zinc-900 dark:text-white' },
      { value: 'easy', label: '简单', color: 'text-green-600 dark:text-green-400' },
      { value: 'medium', label: '中等', color: 'text-yellow-600 dark:text-yellow-400' },
      { value: 'hard', label: '困难', color: 'text-red-600 dark:text-red-400' },
  ];
  
  return (
    <div 
        className="flex-none flux-panel border-r flux-divider flex flex-col relative z-10 h-screen transition-all"
        style={{ width: state.middleColumnWidth }}
    >
      {/* Search Header */}
      <div className="h-16 flex-none flex items-center px-4 border-b flux-divider gap-2 flux-panel sticky top-0 z-20">
        <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors flex-none"
            title={state.isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
        >
            <PanelLeft size={20} />
        </button>

        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            className="w-full bg-zinc-100 dark:bg-zinc-800 text-sm border-none rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary placeholder:text-zinc-500 text-zinc-900 dark:text-white outline-none transition-shadow"
            placeholder="搜索题目..."
            type="text"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-lg flex-none transition-colors ${state.difficultyFilter !== 'all' ? 'text-primary bg-primary/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                title="筛选难度"
            >
                <Filter size={18} />
            </button>
            
            {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <div className="py-1">
                        {difficultyOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setDifficultyFilter(option.value);
                                    setIsFilterOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                            >
                                <span className={option.color}>{option.label}</span>
                                {state.difficultyFilter === option.value && (
                                    <Check size={14} className="text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <button
          onClick={toggleSelectMode}
          className="p-2 rounded-lg flex-none border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
          title={isSelectMode ? '退出多选' : '多选'}
        >
          {isSelectMode ? <X size={16} /> : <ListChecks size={16} />}
        </button>
      </div>

      {/* Info Bar */}
      <div className="px-4 py-2 bg-transparent flex items-center justify-between">
         <span className="text-xs text-zinc-500 flex items-center gap-1 truncate">
            <FolderOpen size={12} className="flex-none" />
            <span className="truncate">{state.selectedFolderId ? '当前筛选目录' : '所有题目'}</span>
            {state.difficultyFilter !== 'all' && (
                 <span className="text-primary flex items-center">
                    • {difficultyOptions.find(o => o.value === state.difficultyFilter)?.label}
                 </span>
            )}
         </span>
         <div className="flex items-center gap-2 flex-none">
            {isSelectMode && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded"
                >
                  {selectedIds.length === filteredProblems.length && filteredProblems.length > 0 ? '取消全选' : '全选'}
                </button>
                <button
                  onClick={handleBatchDelete}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    selectedIds.length === 0
                      ? 'text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                      : 'text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10'
                  }`}
                >
                  批量删除
                </button>
              </>
            )}
            <span className="text-xs font-medium text-zinc-400 flex-none">{filteredProblems.length} 个</span>
         </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {filteredProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-400 text-sm">
                <p>暂无符合条件的题目</p>
            </div>
        ) : (
            filteredProblems.map((problem) => {
            const isActive = state.currentProblemId === problem.id;
            
            return (
                <div
                key={problem.id}
                onClick={() => {
                  setCurrentProblem(problem.id);
                  if (state.currentView !== 'study') {
                    setViewMode('study');
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, problem.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('problemId', problem.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedProblemId = e.dataTransfer.getData('problemId');
                  if (draggedProblemId && draggedProblemId !== problem.id) {
                    reorderProblemWithinFolder(draggedProblemId, problem.id);
                  }
                }}
                className={`
                    group flex flex-col gap-2.5 p-4 rounded-xl border cursor-pointer relative transition-all duration-200
                    ${isActive 
                        ? 'bg-white dark:bg-zinc-900 border-primary/60 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)] dark:shadow-none ring-1 ring-primary/10 z-10' 
                        : 'bg-white dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                    }
                `}
                >
                <div className="flex justify-between items-start w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {isSelectMode && (
                          <input
                              type="checkbox"
                              checked={selectedIds.includes(problem.id)}
                              onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(problem.id);
                              }}
                              className="h-3 w-3 accent-primary"
                          />
                        )}
                        <h3 className={`text-sm font-bold truncate leading-snug ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {problem.title}
                        </h3>
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap mt-0.5 font-medium">{problem.timeAgo}</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[50%] ${isActive ? 'bg-primary/10 text-primary' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                    {problem.subject}
                    </span>
                    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-100 dark:border-zinc-800">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                            problem.difficulty === 'hard' ? 'bg-red-500' :
                            problem.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span className="text-[10px] text-zinc-500">
                            {problem.difficulty === 'hard' ? '困难' : problem.difficulty === 'medium' ? '中等' : '简单'}
                        </span>
                    </div>
                </div>
                </div>
            );
            })
        )}
      </div>

        {/* Global-ish Context Menu for Problem List */}
        {contextMenu && (
            <div 
                className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-lg py-1 w-32 animate-fade-in"
                style={{ left: contextMenu.x, top: contextMenu.y }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteProblem(contextMenu.problemId);
                        setContextMenu(null);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                >
                    <Trash2 size={14} />
                    删除
                </button>
            </div>
        )}
    </div>
  );
};

export default ProblemList;
