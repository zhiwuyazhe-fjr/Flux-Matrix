
import React, { useState, useEffect } from 'react';
import { TreeNode } from '../../types';
import { useStore } from '../../context/StoreContext';
import { ChevronRight, Folder, FileText, FolderOpen, Trash2 } from 'lucide-react';

interface DirectoryTreeProps {
  nodes: TreeNode[];
  level?: number;
  parentId?: string | null;
  selectedNodeIds?: string[];
  onToggleSelect?: (node: TreeNode) => void;
  selectMode?: boolean;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ nodes, level = 0, parentId = null, selectedNodeIds = [], onToggleSelect, selectMode = false }) => {
  const { state, toggleNodeExpansion, setCurrentProblem, setSelectedFolder, setViewMode, deleteNode } = useStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  return (
    <div className="flex flex-col select-none">
      {nodes.map((node) => {
        const isExpanded = state.expandedNodes.includes(node.id);
        const isActiveFile = node.type === 'file' && state.currentProblemId === node.problemId;
        const isActiveFolder = node.type === 'folder' && state.selectedFolderId === node.id;
        const isSelected = selectedNodeIds.includes(node.id);
        
        const paddingLeft = 12 + level * 12; // Indentation logic

        return (
          <div key={node.id}>
            <div
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              className={`
                group flex items-center py-1.5 pr-2 cursor-pointer text-sm transition-colors rounded-r-lg mr-2 relative
                ${isActiveFile 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : isActiveFolder
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }
              `}
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              {/* Interaction Layer: Icon Click triggers Expansion (Folder) */}
              <div 
                className="flex-none flex items-center justify-center w-6 h-6 z-10 hover:bg-black/5 dark:hover:bg-white/10 rounded mr-1"
                onClick={(e) => {
                   e.stopPropagation();
                   if (node.type === 'folder') {
                     toggleNodeExpansion(node.id);
                   }
                }}
              >
                {node.type === 'folder' ? (
                  <span className={`transform transition-transform duration-200 text-zinc-400 ${isExpanded ? 'rotate-90' : ''}`}>
                       <ChevronRight size={14} />
                  </span>
                ) : (
                   <span className="w-4"></span> // Spacer for files without arrow
                )}
              </div>

              {/* Interaction Layer: Main Body Click triggers Selection */}
              <div 
                className="flex-1 flex items-center gap-2 overflow-hidden"
                onClick={() => {
                    if (node.type === 'folder') {
                      setSelectedFolder(node.id);
                      // Optional: Auto-expand on selection
                      if (!isExpanded) toggleNodeExpansion(node.id);
                    } else if (node.type === 'file' && node.problemId) {
                      setCurrentProblem(node.problemId);
                      setViewMode('study'); // Switch to study view to see the problem immediately
                      setSelectedFolder(parentId); // Sync the middle list to show this problem's folder
                    }
                }}
              >
                {selectMode && onToggleSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSelect(node);
                    }}
                    className="h-3 w-3 accent-primary"
                  />
                )}
                <div className="flex-none opacity-70">
                    {node.type === 'folder' ? (
                        isExpanded ? (
                            <FolderOpen size={16} className={isActiveFolder ? "text-primary fill-primary/20" : ""} />
                        ) : (
                            <Folder size={16} className={isActiveFolder ? "text-primary fill-primary/20" : ""} />
                        )
                    ) : (
                        <FileText size={16} />
                    )}
                </div>
                <span className="truncate">{node.title}</span>
              </div>
            </div>

            {/* Context Menu (Local to this level to avoid complexity, fixed positioning handles visibility) */}
            {contextMenu?.nodeId === node.id && (
                <div 
                    className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-lg py-1 w-32 animate-fade-in"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <Trash2 size={14} />
                        删除
                    </button>
                </div>
            )}

            {/* Recursive Render */}
            {node.type === 'folder' && isExpanded && node.children && (
              <DirectoryTree
                nodes={node.children}
                level={level + 1}
                parentId={node.id}
                selectedNodeIds={selectedNodeIds}
                onToggleSelect={onToggleSelect}
                selectMode={selectMode}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DirectoryTree;
