
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
  dragOverId?: string | null;
  setDragOverId?: (value: string | null) => void;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  nodes,
  level = 0,
  parentId = null,
  selectedNodeIds = [],
  onToggleSelect,
  selectMode = false,
  dragOverId,
  setDragOverId
}) => {
  const { state, treeData, toggleNodeExpansion, setCurrentProblem, setSelectedFolder, setViewMode, deleteNode, moveProblemToFolder, moveNodeToFolder, reorderNodesInParent, setExpandedNodes } = useStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [internalDragOverId, setInternalDragOverId] = useState<string | null>(null);
  const activeDragOverId = typeof dragOverId === 'undefined' ? internalDragOverId : dragOverId;
  const setActiveDragOverId = setDragOverId || setInternalDragOverId;

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

  const findNodePath = (items: TreeNode[], targetId: string, path: TreeNode[] = []): TreeNode[] | null => {
    for (const item of items) {
      const nextPath = [...path, item];
      if (item.id === targetId) return nextPath;
      if (item.children) {
        const found = findNodePath(item.children, targetId, nextPath);
        if (found) return found;
      }
    }
    return null;
  };

  const reorderWithinParent = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    const ids = nodes.map((n) => n.id);
    if (!ids.includes(fromId) || !ids.includes(toId)) return;
    const next = ids.filter((id) => id !== fromId);
    const targetIndex = next.indexOf(toId);
    if (targetIndex === -1) return;
    next.splice(targetIndex, 0, fromId);
    reorderNodesInParent(parentId || null, next);
  };

  return (
    <div className="flex flex-col select-none">
      {nodes.map((node) => {
        const isExpanded = state.expandedNodes.includes(node.id);
        const isActiveFolder = node.type === 'folder' && state.selectedFolderId === node.id;
        const isSelected = selectedNodeIds.includes(node.id);
        const isDragOver = node.type === 'folder' && activeDragOverId === node.id;
        
        const paddingLeft = 12 + level * 12; // Indentation logic

        return (
          <div key={node.id}>
            <div
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('nodeId', node.id);
                e.dataTransfer.setData('nodeType', node.type);
                e.dataTransfer.setData('parentId', parentId || 'root');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (node.type === 'folder') setActiveDragOverId(node.id);
              }}
              onDragLeave={() => {
                if (node.type !== 'folder') return;
                if (activeDragOverId === node.id) setActiveDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setActiveDragOverId(null);
                const movedNodeId = e.dataTransfer.getData('nodeId');
                const movedNodeType = e.dataTransfer.getData('nodeType');
                const problemId = e.dataTransfer.getData('problemId');
                const dragParentId = e.dataTransfer.getData('parentId') || 'root';
                const currentParent = parentId || 'root';
                if (movedNodeId && movedNodeType) {
                  if (dragParentId === currentParent) {
                    reorderWithinParent(movedNodeId, node.id);
                    return;
                  }
                  if (node.type === 'folder' && movedNodeId !== node.id) {
                    moveNodeToFolder(movedNodeId, node.id);
                  }
                  return;
                }
                if (problemId) {
                  if (node.type === 'folder') {
                    moveProblemToFolder(problemId, node.id);
                  }
                }
              }}
              className={`
                group flex items-center py-1.5 pr-2 cursor-pointer text-sm transition-colors rounded-r-lg mr-2 relative
                ${isActiveFolder
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }
                ${isDragOver ? 'ring-1 ring-primary/40 bg-primary/10' : ''}
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
                      const path = findNodePath(treeData, node.id) || [];
                      const pathIds = path.filter((p) => p.type === 'folder').map((p) => p.id);
                      setExpandedNodes(pathIds);
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
                dragOverId={activeDragOverId}
                setDragOverId={setActiveDragOverId}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DirectoryTree;
