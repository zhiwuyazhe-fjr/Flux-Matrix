
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useStore } from './context/StoreContext';
import { TreeNode } from './types';
import Sidebar from './components/layout/Sidebar';
import ProblemList from './components/layout/ProblemList';
import StudyView from './components/views/StudyView';
import PracticeView from './components/views/PracticeView';
import FeedbackView from './components/views/FeedbackView';
import ImportWorkbench from './components/views/ImportWorkbench';
import LoginView from './components/views/LoginView';
import ForgotPasswordView from './components/views/ForgotPasswordView';
import RegisterView from './components/views/RegisterView';
import SettingsView from './components/views/SettingsView';
import HelpCenter from './components/views/HelpCenter';
import UpgradeView from './components/views/UpgradeView';
import LandingPage from './components/views/LandingPage';
import { ChevronRight, MoreHorizontal, Maximize2, Minimize2, Moon, Sun, PanelLeft } from 'lucide-react';

const AppContent: React.FC = () => {
  const { state, problems, treeData, setViewMode, toggleFullscreen, toggleDarkMode, setSelectedFolder, setExpandedNodes, setCurrentProblem, toggleSidebar, setColumnWidth, deleteProblem } = useStore();
  
  const [resizing, setResizing] = useState<'sidebar' | 'middle' | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const currentProblem = state.currentProblemId ? problems[state.currentProblemId] : null;
  
  // Views that take up the full right area (hide Problem List)
  const isFullPageView = ['import', 'settings', 'upgrade', 'help'].includes(state.currentView);

  // Drag Handlers
  const startResizing = (type: 'sidebar' | 'middle') => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(type);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setIsHeaderMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizing) return;

        if (resizing === 'sidebar') {
            const newWidth = e.clientX;
            if (newWidth > 150 && newWidth < 500) {
                setColumnWidth('sidebar', newWidth);
            }
        } else if (resizing === 'middle') {
             // Middle width depends on sidebar width if open
             const sidebarOffset = state.isSidebarOpen ? state.sidebarWidth : 0;
             const newWidth = e.clientX - sidebarOffset;
             if (newWidth > 250 && newWidth < 800) {
                 setColumnWidth('middle', newWidth);
             }
        }
    };

    const handleMouseUp = () => {
        setResizing(null);
    };

    if (resizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    } else {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
  }, [resizing, state.isSidebarOpen, state.sidebarWidth, setColumnWidth]);


  // Calculate breadcrumb path for the current problem
  const breadcrumbs = useMemo(() => {
    if (!state.currentProblemId) return [];

    const findPath = (nodes: TreeNode[], targetId: string, path: TreeNode[]): TreeNode[] | null => {
      for (const node of nodes) {
        if (node.type === 'file' && node.problemId === targetId) {
          return [...path, node];
        }
        if (node.children) {
          const result = findPath(node.children, targetId, [...path, node]);
          if (result) return result;
        }
      }
      return null;
    };

    return findPath(treeData, state.currentProblemId, []) || [];
  }, [state.currentProblemId, treeData]);

  const authView = useMemo(() => {
    if (state.isLoggedIn) return null;
    if (state.currentView === 'landing') return <LandingPage />;
    if (state.currentView === 'forgot_password') return <ForgotPasswordView />;
    if (state.currentView === 'register') return <RegisterView />;
    return <LoginView />;
  }, [state.isLoggedIn, state.currentView]);

  // Auth Check
  if (!state.isLoggedIn) {
    return authView;
  }

  // Main Render Logic
  const renderMainContent = () => {
      if (state.currentView === 'import') return <ImportWorkbench />;
      if (state.currentView === 'settings') return <SettingsView />;
      if (state.currentView === 'upgrade') return <UpgradeView />;
      if (state.currentView === 'help') return <HelpCenter />;

      // Default Standard Views (Study/Practice/Feedback)
      return (
        <>
            {/* Standard View: Problem List Column */}
            {!state.isFullscreen && (
                <>
                    <ProblemList />
                    {/* Middle Column Resizer */}
                    <div 
                        onMouseDown={startResizing('middle')}
                        className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors relative z-20 group flex items-center justify-center flex-none -ml-0.5"
                    >
                        <div className={`w-0.5 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-primary transition-colors ${resizing === 'middle' ? 'bg-primary' : ''}`}></div>
                    </div>
                </>
            )}

            {/* Standard View: Main Content Area */}
            <main className="flex-1 flex flex-col flux-panel min-w-0 h-full relative">
                
                {/* Sticky Header */}
                <header className="h-16 flex-none flex items-center justify-between px-6 border-b flux-divider flux-panel sticky top-0 z-10 shadow-sm">
                
                {/* Left Side: Toggle Sidebar (if list hidden) + Breadcrumbs */}
                <div className="flex items-center text-sm text-zinc-500 overflow-hidden whitespace-nowrap mr-4 mask-linear-fade">
                    {/* Show Toggle Sidebar here ONLY if ProblemList is hidden (fullscreen mode) */}
                    {state.isFullscreen && (
                        <button 
                            onClick={toggleSidebar}
                            className="mr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            title={state.isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
                        >
                            <PanelLeft size={20} />
                        </button>
                    )}

                    {breadcrumbs.length > 0 ? (
                        breadcrumbs.map((node, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            return (
                                <React.Fragment key={node.id}>
                                    {index > 0 && <ChevronRight size={14} className="flex-none text-zinc-400 mx-1" />}
                                    <button 
                                        onClick={() => {
                                            if (node.type === 'folder') {
                                                setSelectedFolder(node.id);
                                                const folderPath = breadcrumbs
                                                  .filter((item) => item.type === 'folder')
                                                  .slice(0, index + 1)
                                                  .map((item) => item.id);
                                                setExpandedNodes(folderPath);
                                                setCurrentProblem(null);
                                                setViewMode('study');
                                            }
                                        }}
                                        disabled={isLast} 
                                        className={`
                                            transition-colors truncate max-w-[120px] sm:max-w-xs
                                            ${isLast 
                                                ? 'text-zinc-800 dark:text-zinc-200 font-medium cursor-default' 
                                                : 'hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer'
                                            }
                                        `}
                                        title={node.title}
                                    >
                                        {node.title}
                                    </button>
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <span className="text-zinc-500">题库</span>
                    )}
                </div>
                
                <div className="flex items-center gap-3 flex-none">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex items-center">
                    <button 
                        onClick={() => setViewMode('study')}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                            state.currentView === 'study' 
                            ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                        学习
                    </button>
                    <button 
                        onClick={() => setViewMode('practice')}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                            state.currentView === 'practice' || state.currentView === 'feedback'
                            ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' 
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                        训练
                    </button>
                    </div>
                    
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                    {/* Dark Mode Toggle */}
                    <button 
                        onClick={toggleDarkMode}
                        className="p-2 text-zinc-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title={state.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                    {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button 
                        onClick={toggleFullscreen}
                        className={`p-2 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 ${state.isFullscreen ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                        title={state.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                    {state.isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    
                    <div className="relative ml-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsHeaderMenuOpen((prev) => !prev);
                            }}
                            className="text-zinc-400 hover:text-primary transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="更多"
                        >
                            <MoreHorizontal size={24} />
                        </button>
                        {isHeaderMenuOpen && currentProblem && (
                            <div
                                className="absolute right-0 mt-2 w-32 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-20 overflow-hidden animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        deleteProblem(currentProblem.id);
                                        setIsHeaderMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    删除题目
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </header>

                {/* View Switcher */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {currentProblem ? (
                        <>
                            {state.currentView === 'study' && <StudyView problem={currentProblem} />}
                            {state.currentView === 'practice' && <PracticeView problem={currentProblem} />}
                            {state.currentView === 'feedback' && <FeedbackView problem={currentProblem} />}
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400 flex-col gap-2">
                            <p>请从左侧选择一个题目</p>
                            {state.isFullscreen && (
                                <button 
                                    onClick={toggleFullscreen}
                                    className="text-primary text-sm hover:underline"
                                >
                                    退出全屏以选择
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
      );
  }

  return (
    <div className="flux-root flex h-screen w-screen text-[#E0E0E0] font-mono overflow-hidden">
        
      {/* Sidebar */}
      {state.isSidebarOpen && <Sidebar />}
      
      {/* Sidebar Resizer */}
      {state.isSidebarOpen && (
        <div 
            onMouseDown={startResizing('sidebar')}
            className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors relative z-30 group flex items-center justify-center flex-none -ml-0.5"
        >
            <div className={`w-0.5 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-primary transition-colors ${resizing === 'sidebar' ? 'bg-primary' : ''}`}></div>
        </div>
      )}

      {/* Main Layout Switch */}
      {renderMainContent()}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
