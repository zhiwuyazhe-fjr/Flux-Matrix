import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, Cpu, HelpCircle, ChevronDown, PanelLeft, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const highlightKeywords = (text: string) => {
  const keywords = ['Flux Matrix', 'Flux', 'Matrix', 'Portal'];
  const regex = new RegExp(`(${keywords.map((k) => k.replace(/\s+/g, '\\s+')).join('|')})`, 'g');
  return text.split(regex).map((part, index) => {
    if (keywords.includes(part.replace(/\s+/g, ' '))) {
      return (
        <span key={`${part}-${index}`} className="text-cyan-400 font-mono">
          {part}
        </span>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const renderWithHighlights = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string') return highlightKeywords(children);
  if (Array.isArray(children)) return children.map((child, index) => (
    <React.Fragment key={index}>{renderWithHighlights(child)}</React.Fragment>
  ));
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      children: renderWithHighlights(children.props.children)
    });
  }
  return children;
};

const HelpCenter: React.FC = () => {
  const { toggleSidebar, setViewMode } = useStore();
  const [openId, setOpenId] = useState<'manifesto' | 'protocol' | 'faq' | null>('manifesto');

  const introMarkdown = `
欢迎来到 Flux Matrix。这不是一个传统的题库，而是一个活体知识引擎。在这里，我们将混沌的题目转化为有序的逻辑矩阵。
`;

  const manifestoMarkdown = `
在传统的学习中，题目是静态的孤岛，知识是沉睡的档案。  
我们认为，真正的理解发生在 **“流动 (Flux)”** 之中。

**Flux Matrix** 基于两大核心理念构建：

1. **The Flux (流)**：  
知识不应被封存。当你输入一道难题，我们的 AI 引擎就像一束穿透迷雾的光，瞬间拆解其语义结构，让解题思路像流体一样清晰呈现。
2. **The Matrix (矩阵)**：  
你做过的每一道题，都不应被遗忘。它们会被自动向量化，编织进你的个人知识矩阵中。随着时间推移，这个矩阵将比你自己更了解你的思维盲区。

我们不提供简单的“答案”，我们提供 **“认知的升维”**。
`;

  const protocolMarkdown = `
### 01. 启动端口 (The Portal)

在首页中央，那个微发光的输入区域是通往矩阵的入口。

- **文本输入**：直接粘贴复杂的数学公式、代码片段或文字描述。我们的自然语言解析器支持 LaTeX 和 Markdown。
- **视觉捕获**：点击 \`Scan\` 按钮，上传题目图片。我们的 OCR 引擎会自动识别文字、几何图形甚至手写笔记。

### 02. 深度解码 (Deep Decode)

一旦提交，AI 将启动多维分析：

- **Step 1 语义提取**：识别题目背后的核心考点（如“微积分-链式法则”或“算法-动态规划”）。
- **Step 2 逻辑推演**：你看到的不是冰冷的步骤，而是模拟人类专家的思维链（Chain of Thought）。
- **Step 3 关联推荐**：系统会自动从矩阵深处检索出 3 道相似题，帮助你举一反三。

### 03. 矩阵管理 (Matrix Management)

进入 \`My Matrix\` 界面，这是你的第二大脑。

- **视图切换**：支持“列表视图”和“知识图谱视图”。
- **智能标签**：每一道题都会自动打上 \`难度\`、\`科目\`、\`掌握度\` 的动态标签。
- **复习流**：点击 \`Review Mode\`，系统会根据艾宾浩斯遗忘曲线，向你推送最需要复习的“薄弱节点”。
`;

  const faqMarkdown = `
**Q: Flux Matrix 支持哪些学科？**  
A: 我们的底层模型是全科通用的。从高阶数学、量子物理，到编程算法、历史哲学，Flux Matrix 都能构建相应的逻辑模型。

**Q: 这里的“题库”是静态的吗？**  
A: 不。Flux Matrix 是动态生长的。你上传的每一道新题，都在训练属于你个人的专属模型。你用得越多，它越懂你。

**Q: 为什么界面是深色的？**  
A: 为了专注。深空黑（Deep Space Black）背景配合电光青（Electric Cyan）信息流，旨在创造一个无干扰的沉浸式思考空间。

> Flux MatrixSharp Minds. Infinite Flow.
`;

  const sections = useMemo(() => ([
    { id: 'manifesto' as const, title: '产品哲学', icon: Sparkles, content: manifestoMarkdown },
    { id: 'protocol' as const, title: '操作协议', icon: Cpu, content: protocolMarkdown },
    { id: 'faq' as const, title: '常见问题', icon: HelpCircle, content: faqMarkdown }
  ]), []);

  const textBase = 'text-zinc-700 dark:text-gray-400 leading-relaxed text-sm md:text-base';

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-zinc-50 dark:bg-[#0B0C15] text-zinc-900 dark:text-white animate-fade-in overflow-y-auto">
      <header className="h-16 flex-none flex items-center justify-between px-6 border-b border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white rounded-lg transition-colors"
          >
            <PanelLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">
            帮助中心
          </h1>
        </div>
        <button
          onClick={() => setViewMode('settings')}
          className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white rounded-lg transition-colors"
          aria-label="关闭"
        >
          <X size={20} />
        </button>
      </header>

      <div className="max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">
            Flux Matrix：让思维流动，让知识成网
          </h2>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className={`${textBase}`}>{renderWithHighlights(children)}</p>
            }}
          >
            {introMarkdown}
          </ReactMarkdown>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openId === section.id;
            return (
              <div key={section.id} className="rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur shadow-[0_8px_26px_rgba(15,23,42,0.06)] dark:shadow-[0_0_30px_rgba(34,211,238,0.08)]">
                <button
                  onClick={() => setOpenId(isOpen ? null : section.id)}
                  className="w-full flex items-center justify-between bg-white/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 rounded-lg p-4 hover:bg-white dark:hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-cyan-400" />
                    <span className="font-semibold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown size={18} className={`text-zinc-500 dark:text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-6 pt-4 space-y-3">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">
                            {renderWithHighlights(children)}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60 mt-6">
                            {renderWithHighlights(children)}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-zinc-900 dark:text-white/90 mt-5">
                            {renderWithHighlights(children)}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className={`${textBase}`}>{renderWithHighlights(children)}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="text-zinc-900 dark:text-white">{renderWithHighlights(children)}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 space-y-2">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 space-y-2">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className={`${textBase}`}>{renderWithHighlights(children)}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-cyan-400/40 pl-4 text-zinc-600 dark:text-gray-400 italic">
                            {renderWithHighlights(children)}
                          </blockquote>
                        )
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
