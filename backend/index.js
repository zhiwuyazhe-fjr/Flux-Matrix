require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  OPENROUTER_REFERER,
  OPENROUTER_TITLE
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('缺少环境变量：SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

const getUserFromRequest = async (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { error: 'missing_token' };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: 'invalid_token' };
  }

  return { user: data.user, token };
};

const requireAuth = async (req, res, next) => {
  const { user, error } = await getUserFromRequest(req);
  if (error) {
    return res.status(401).json({ message: '未登录或会话已过期' });
  }
  req.user = user;
  next();
};

const ensureProfile = async (user) => {
  const { data: existing, error } = await supabaseAdmin
    .from('profiles')
    .select('id,name,email,avatar,plan')
    .eq('id', user.id)
    .maybeSingle();

  if (existing && !error) return existing;

  const profilePayload = {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || '新用户',
    email: user.email || '',
    plan: 'free'
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert(profilePayload)
    .select('id,name,email,avatar,plan')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
};

const normalizeProblem = (problem) => ({
  id: problem.id,
  title: problem.title,
  subject: problem.subject,
  difficulty: problem.difficulty,
  timeAgo: problem.time_ago || '刚刚',
  tags: problem.tags || [],
  description: problem.description || undefined
});

const parseDataUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    data: match[2]
  };
};

const getExtensionFromMime = (mime) => {
  if (!mime) return 'png';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'png';
};

const CandidateSchema = z.object({
  content: z.string().min(1)
});

const CandidateListSchema = z.array(CandidateSchema);

const AnalysisResultSchema = z.object({
  title: z.string(),
  input_check: z.object({
    is_complete: z.boolean(),
    issue_description: z.string().nullable()
  }),
  essence_one_sentence: z.string(),
  tags: z.object({
    big: z.string(),
    mid: z.string(),
    small: z.string()
  }),
  learning_mode: z.object({
    assumed_level: z.literal('zero'),
    key_concepts: z.array(z.object({
      name: z.string(),
      plain_explain: z.string(),
      why_it_matters: z.string()
    })),
    logic_strategy: z.string(),
    solution_steps: z.array(z.object({
      step_seq: z.number(),
      goal: z.string(),
      details: z.string(),
      check_point: z.string()
    })),
    final_answer: z.string(),
    common_mistakes: z.array(z.string()),
    self_check: z.array(z.string())
  })
});

const parseCandidates = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return CandidateListSchema.parse(parsed);
  } catch {
    // Try to extract JSON array from markdown/code fences or extra text
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return CandidateListSchema.parse(parsed);
    } catch {
      return null;
    }
  }
};

const ANALYSIS_SYSTEM_PROMPT = `

# Role

你是一个“Smart题库助手”的核心分析引擎。你的输入是**一道数学/理科题目的文本内容**（由前序 OCR 步骤生成）。

你的任务是：基于这段文本，进行深度语义分析，输出**针对零基础小白的深度学习教程**，并严格以 **JSON 格式**输出。

# Input

用户提供的题目文本字符串（可能包含 LaTeX 或 纯文本符号）。

# Output Constraint (Highest Priority)

1. **只输出一个 JSON 对象**。
2. **严禁**输出 markdown 代码块标记（如 \`\`\`json），严禁输出任何 JSON 以外的解释性文字。
3. **输出格式标准化**：
    - 所有数学公式必须转化为标准 LaTeX 格式。
    - 行内公式用 \`$ ... $\` 包裹。
    - 独立公式用 \`$$...$$\` 包裹。
    - 示例：输入可能是 "x^2 + y^2 = 1"，输出必须是 "$x^2 + y^2 = 1$"。

# Workflow & Rules

## 1. 文本完整性校验 (Data Integrity Check)

- 在分析前，先判断输入的文本在数学逻辑上是否完整。
- 如果文本存在明显 OCR 错误（如“求函数 f(x)= 的导数”后面没字了），必须在 JSON 的 \`input_check\` 字段报错，不要强行解答。

## 2. 一句话本质总结 (Field: \`essence_one_sentence\`)

- **标准**：必须符合句式 **“使用[核心方法/知识点]完成[具体任务]”**。
- **铁律**：
    - 长度严格控制在 **25 个中文字符以内**。
    - **禁止**给出答案，**禁止**解释过程。
    - **禁止**出现“本题”、“这道题”等废话。
    - 示例：✅ “利用洛必达法则求0/0型极限” | ❌ “这道题让我们求极限”

## 3. 标签体系 (Field: \`tags\`)

- **big (Level 1)**: 学科（如：高等数学、线性代数）。
- **mid (Level 2)**: 题型范畴（如：微分方程求解）。
- **small (Level 3)**: 具体考点（如：二阶常系数齐次方程）。

## 4. 零基础学习模式 (Field: \`learning_mode\`)

- **核心假设**：用户是**完全零基础**的小白（assumed_level: "zero"）。
- **关键概念 (key_concepts)**：
    - 提取题目中 3-5 个核心术语。
    - **plain_explain**: 用**大白话或生活类比**解释它是什么（<60字），拒绝学术堆砌。
    - **why_it_matters**: 解释为什么要用这个概念解这道题。
- **解题战略 (logic_strategy)**：
    - **逻辑先行，计算在后**。先用一段文字描述宏观思路（第一步干嘛，第二步干嘛），就像教人走迷宫先画路线图。
- **步骤详解 (solution_plan)**：
    - 步骤必须严谨，逻辑连贯。
    - 每一步包含 \`goal\` (这一步要干嘛) 和 \`details\` (详细推导，Markdown + LaTeX)。

# JSON Schema (Strictly Follow)

{

"title": "题目名称（直接复用 essence_one_sentence）",

"input_check": {

"is_complete": true,

"issue_description": "如果完整填 null；如果不完整，描述缺了什么（如：缺少等号右边的数据）"

},

"essence_one_sentence": "使用[方法]完成[任务]",

"tags": {

"big": "学科",

"mid": "范畴",

"small": "考点"

},

"learning_mode": {

"assumed_level": "zero",

"key_concepts": [

  {

    "name": "概念名称（如：洛必达法则）",

    "plain_explain": "小白解释（如：当分子分母大家一起趋向于0时，比较它们变化快慢的方法...）",

    "why_it_matters": "本题中负责处理 x->0 时的不定型问题"

  }

],

"logic_strategy": "一段 Markdown 文本。先描述宏观解题思路（不要堆砌公式，用文字讲逻辑）。",

"solution_steps": [

  {

    "step_seq": 1,

    "goal": "这一步的目标（如：化简分子）",

    "details": "这一步的详细推导过程（Markdown + LaTeX）",

    "check_point": "小贴士：注意这里不要漏掉负号"

  }

],

"final_answer": "最终结果（使用 LaTeX，如 $x=1$）。如果信息缺失无法计算，填'因信息缺失无法给出'",

"common_mistakes": [

  "易错点1（必须贴合本题）",

  "易错点2"

],

"self_check": [

  "自检方法1"

]

}

}

`;

const callOpenAIForQuestions = async (imageUrl) => {
  if (!OPENAI_API_KEY) {
    throw new Error('未配置 OPENAI_API_KEY');
  }

  const baseUrl = OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = OPENAI_MODEL || 'gpt-4o';

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个善于拆解题目的助手，只输出 JSON 数组，不要带其它说明。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "请分析图片，识别出里面的所有题目。请将每一道题的内容提取出来。若题目包含选择题选项，请把选项一并写入题目文本中（例如：A. ... B. ... C. ... D. ...）。返回一个 JSON 数组，格式为 [{ content: '题目文本...' }, ...]。只返回 JSON。"
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    temperature: 0.2
  };

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const isAscii = (value) => /^[\x00-\x7F]*$/.test(value);

  if (OPENROUTER_REFERER && isAscii(OPENROUTER_REFERER)) {
    headers['HTTP-Referer'] = OPENROUTER_REFERER;
  }
  if (OPENROUTER_TITLE && isAscii(OPENROUTER_TITLE)) {
    headers['X-Title'] = OPENROUTER_TITLE;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 调用失败: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 未返回有效内容');
  }

  const candidates = parseCandidates(content);
  if (!candidates) {
    throw new Error('OpenAI 返回格式不符合预期');
  }

  return candidates;
};

const callOpenAIForAnalysis = async (questionText) => {
  if (!OPENAI_API_KEY) {
    throw new Error('未配置 OPENAI_API_KEY');
  }

  const baseUrl = OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = OPENAI_MODEL || 'gpt-4o';

  const payload = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: questionText }
    ],
    temperature: 0.2
  };

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const isAscii = (value) => /^[\x00-\x7F]*$/.test(value);
  if (OPENROUTER_REFERER && isAscii(OPENROUTER_REFERER)) {
    headers['HTTP-Referer'] = OPENROUTER_REFERER;
  }
  if (OPENROUTER_TITLE && isAscii(OPENROUTER_TITLE)) {
    headers['X-Title'] = OPENROUTER_TITLE;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 调用失败: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 未返回有效内容');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI 返回格式不符合预期');
    parsed = JSON.parse(match[0]);
  }

  return AnalysisResultSchema.parse(parsed);
};

const buildTree = (rows) => {
  const map = new Map();
  const roots = [];

  rows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      title: row.title,
      type: row.type,
      problemId: row.problem_id || undefined,
      children: []
    });
  });

  rows.forEach((row) => {
    const node = map.get(row.id);
    if (!row.parent_id) {
      roots.push(node);
      return;
    }
    const parent = map.get(row.parent_id);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/questions', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('id,image_url,summary,content,status,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ message: '获取题目失败' });
  }

  res.json({ questions: data || [] });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: '邮箱和密码不能为空' });
  }

  try {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || '' }
    });

    if (createError) throw createError;

    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !sessionData?.session) {
      return res.status(401).json({ message: '注册成功，但登录失败，请重试登录' });
    }

    const profile = await ensureProfile(created.user);

    res.json({
      token: sessionData.session.access_token,
      profile: {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        plan: profile.plan
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message || '注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: '邮箱和密码不能为空' });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    return res.status(401).json({ message: '账号或密码错误' });
  }

  try {
    const profile = await ensureProfile(data.user);
    res.json({
      token: data.session.access_token,
      profile: {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        plan: profile.plan
      }
    });
  } catch (err) {
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

app.post('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: '当前密码和新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码长度不能少于6位' });
  }

  const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword
  });

  if (verifyError) {
    return res.status(400).json({ message: '当前密码不正确' });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
    password: newPassword
  });

  if (updateError) {
    return res.status(500).json({ message: '更新密码失败' });
  }

  res.json({ success: true });
});

app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const profile = await ensureProfile(req.user);

    const { data: problems, error: problemsError } = await supabaseAdmin
      .from('problems')
      .select('id,title,subject,difficulty,time_ago,tags,description,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (problemsError) throw problemsError;

    const { data: favoriteRows, error: favoritesError } = await supabaseAdmin
      .from('favorites')
      .select('problem_id')
      .eq('user_id', userId);

    if (favoritesError) throw favoritesError;

    const { data: treeRows, error: treeError } = await supabaseAdmin
      .from('tree_nodes')
      .select('id,title,type,parent_id,problem_id,sort_order,created_at')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (treeError) throw treeError;

    res.json({
      profile: {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        plan: profile.plan
      },
      problems: (problems || []).map(normalizeProblem),
      favorites: (favoriteRows || []).map(row => row.problem_id),
      tree: buildTree(treeRows || [])
    });
  } catch (error) {
    res.status(500).json({ message: error.message || '初始化数据失败' });
  }
});

app.post('/api/favorites/toggle', requireAuth, async (req, res) => {
  const { problemId } = req.body || {};
  if (!problemId) {
    return res.status(400).json({ message: '缺少题目ID' });
  }

  const userId = req.user.id;
  const { data: existing } = await supabaseAdmin
    .from('favorites')
    .select('problem_id')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('problem_id', problemId);
  } else {
    await supabaseAdmin
      .from('favorites')
      .insert({ user_id: userId, problem_id: problemId });
  }

  const { data: favoriteRows } = await supabaseAdmin
    .from('favorites')
    .select('problem_id')
    .eq('user_id', userId);

  res.json({ favorites: (favoriteRows || []).map(row => row.problem_id) });
});

app.post('/api/folders', requireAuth, async (req, res) => {
  const { title, parentId } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ message: '文件夹名称不能为空' });
  }

  const { data, error } = await supabaseAdmin
    .from('tree_nodes')
    .insert({
      user_id: req.user.id,
      title: title.trim(),
      type: 'folder',
      parent_id: parentId || null,
      sort_order: Date.now()
    })
    .select('id,title,type,parent_id')
    .single();

  if (error) {
    return res.status(500).json({ message: '创建文件夹失败' });
  }

  res.json({
    node: {
      id: data.id,
      title: data.title,
      type: 'folder',
      children: []
    }
  });
});

app.delete('/api/nodes/:id', requireAuth, async (req, res) => {
  const nodeId = req.params.id;
  const userId = req.user.id;

  const { data: nodes, error } = await supabaseAdmin
    .from('tree_nodes')
    .select('id,parent_id,problem_id,type')
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ message: '删除失败' });
  }

  const childrenMap = new Map();
  nodes.forEach((node) => {
    if (!childrenMap.has(node.parent_id)) {
      childrenMap.set(node.parent_id, []);
    }
    childrenMap.get(node.parent_id).push(node.id);
  });

  const toDelete = [];
  const stack = [nodeId];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    toDelete.push(current);
    const children = childrenMap.get(current) || [];
    children.forEach(childId => stack.push(childId));
  }

  const deletedProblemIds = nodes
    .filter(node => toDelete.includes(node.id) && node.type === 'file' && node.problem_id)
    .map(node => node.problem_id);

  if (toDelete.length > 0) {
    await supabaseAdmin
      .from('tree_nodes')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
  }

  if (deletedProblemIds.length > 0) {
    await supabaseAdmin
      .from('problems')
      .delete()
      .in('id', deletedProblemIds)
      .eq('user_id', userId);

    await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .in('problem_id', deletedProblemIds);
  }

  res.json({ deletedIds: toDelete, deletedProblemIds });
});

app.delete('/api/problems/:id', requireAuth, async (req, res) => {
  const problemId = req.params.id;
  const userId = req.user.id;

  await supabaseAdmin
    .from('problems')
    .delete()
    .eq('id', problemId)
    .eq('user_id', userId);

  await supabaseAdmin
    .from('tree_nodes')
    .delete()
    .eq('user_id', userId)
    .eq('problem_id', problemId);

  await supabaseAdmin
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('problem_id', problemId);

  res.json({ deletedId: problemId });
});

app.post('/api/problems/batch-delete', requireAuth, async (req, res) => {
  const { problemIds } = req.body || {};
  if (!Array.isArray(problemIds) || problemIds.length === 0) {
    return res.status(400).json({ message: '缺少题目ID列表' });
  }

  await supabaseAdmin
    .from('problems')
    .delete()
    .in('id', problemIds)
    .eq('user_id', req.user.id);

  await supabaseAdmin
    .from('tree_nodes')
    .delete()
    .eq('user_id', req.user.id)
    .in('problem_id', problemIds);

  await supabaseAdmin
    .from('favorites')
    .delete()
    .eq('user_id', req.user.id)
    .in('problem_id', problemIds);

  res.json({ deletedProblemIds: problemIds });
});

app.post('/api/profile', requireAuth, async (req, res) => {
  const updates = {};
  const fields = ['name', 'email', 'avatar', 'plan'];
  fields.forEach((field) => {
    if (req.body && req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: req.user.id,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .select('id,name,email,avatar,plan')
    .single();

  if (error) {
    return res.status(500).json({ message: '更新用户资料失败' });
  }

  res.json({
    profile: {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      plan: data.plan
    }
  });
});

app.post('/api/avatar', requireAuth, async (req, res) => {
  const { dataUrl } = req.body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ message: '头像格式不正确' });
  }

  const buffer = Buffer.from(parsed.data, 'base64');
  const extension = getExtensionFromMime(parsed.mime);
  const path = `${req.user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: parsed.mime,
      upsert: true
    });

  if (uploadError) {
    return res.status(500).json({ message: '上传头像失败' });
  }

  const { data: publicData } = supabaseAdmin
    .storage
    .from('avatars')
    .getPublicUrl(path);

  const avatarUrl = publicData?.publicUrl;
  if (!avatarUrl) {
    return res.status(500).json({ message: '获取头像地址失败' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: req.user.id,
      avatar: avatarUrl,
      updated_at: new Date().toISOString()
    })
    .select('name,email,avatar,plan')
    .single();

  if (profileError) {
    return res.status(500).json({ message: '更新头像失败' });
  }

  res.json({
    avatarUrl,
    profile: {
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      plan: profile.plan
    }
  });
});

app.post('/api/nodes/batch-delete', requireAuth, async (req, res) => {
  const { nodeIds } = req.body || {};
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    return res.status(400).json({ message: '缺少节点ID列表' });
  }

  const { data: nodes, error } = await supabaseAdmin
    .from('tree_nodes')
    .select('id,parent_id,problem_id,type')
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ message: '删除失败' });
  }

  const childrenMap = new Map();
  nodes.forEach((node) => {
    if (!childrenMap.has(node.parent_id)) {
      childrenMap.set(node.parent_id, []);
    }
    childrenMap.get(node.parent_id).push(node.id);
  });

  const toDelete = [];
  const stack = [...nodeIds];
  while (stack.length) {
    const current = stack.pop();
    if (!current || toDelete.includes(current)) continue;
    toDelete.push(current);
    const children = childrenMap.get(current) || [];
    children.forEach(childId => stack.push(childId));
  }

  const deletedProblemIds = nodes
    .filter(node => toDelete.includes(node.id) && node.type === 'file' && node.problem_id)
    .map(node => node.problem_id);

  if (toDelete.length > 0) {
    await supabaseAdmin
      .from('tree_nodes')
      .delete()
      .in('id', toDelete)
      .eq('user_id', req.user.id);
  }

  if (deletedProblemIds.length > 0) {
    await supabaseAdmin
      .from('problems')
      .delete()
      .in('id', deletedProblemIds)
      .eq('user_id', req.user.id);

    await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .in('problem_id', deletedProblemIds);
  }

  res.json({ deletedIds: toDelete, deletedProblemIds });
});

app.post('/api/import-question', requireAuth, async (req, res) => {
  const { dataUrl } = req.body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ message: '图片格式不正确' });
  }

  const buffer = Buffer.from(parsed.data, 'base64');
  const extension = getExtensionFromMime(parsed.mime);
  const path = `${req.user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('question_images')
    .upload(path, buffer, {
      contentType: parsed.mime,
      upsert: true
    });

  if (uploadError) {
    return res.status(500).json({ message: '图片上传失败' });
  }

  const { data: publicData } = supabaseAdmin
    .storage
    .from('question_images')
    .getPublicUrl(path);

  const imageUrl = publicData?.publicUrl;
  if (!imageUrl) {
    return res.status(500).json({ message: '获取图片链接失败' });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('questions')
    .insert({
      image_url: imageUrl,
      summary: '新导入题目 (待AI分析)',
      status: 'unclassified',
      created_at: new Date().toISOString()
    })
    .select('id,image_url,summary,status,created_at')
    .single();

  if (insertError || !inserted) {
    return res.status(500).json({ message: '写入题目失败' });
  }

  res.json({ question: inserted });
});

app.post('/api/import-questions/analyze', requireAuth, async (req, res) => {
  const { dataUrl } = req.body || {};
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ message: '图片格式不正确' });
  }

  try {
    const buffer = Buffer.from(parsed.data, 'base64');
    const extension = getExtensionFromMime(parsed.mime);
    const path = `${req.user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('question_images')
      .upload(path, buffer, {
        contentType: parsed.mime,
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({ message: '图片上传失败' });
    }

    const { data: publicData } = supabaseAdmin
      .storage
      .from('question_images')
      .getPublicUrl(path);

    const imageUrl = publicData?.publicUrl;
    if (!imageUrl) {
      return res.status(500).json({ message: '获取图片链接失败' });
    }

    const candidates = await callOpenAIForQuestions(imageUrl);

    res.json({ imageUrl, candidates });
  } catch (error) {
    res.status(500).json({ message: error.message || '分析失败' });
  }
});

app.post('/api/analyze-question', requireAuth, async (req, res) => {
  const { questionText } = req.body || {};
  if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
    return res.status(400).json({ message: '题目文本不能为空' });
  }

  try {
    const result = await callOpenAIForAnalysis(questionText.trim());
    res.json({ result });
  } catch (error) {
    res.status(500).json({ message: error.message || '分析失败' });
  }
});

app.post('/api/questions/batch', requireAuth, async (req, res) => {
  const { imageUrl, items, parentFolderId } = req.body || {};
  if (!imageUrl || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '题目内容不能为空' });
  }

  const rows = items
    .map((item) => ({
      image_url: imageUrl,
      content: String(item.content || '').trim()
    }))
    .filter((item) => item.content.length > 0);

  if (rows.length === 0) {
    return res.status(400).json({ message: '题目内容不能为空' });
  }

  const insertedQuestions = [];

  for (const row of rows) {
    try {
      const analysis = await callOpenAIForAnalysis(row.content);
      const summary = analysis.essence_one_sentence;
      const status = 'pending_analysis';

      const { data: questionRow, error: questionError } = await supabaseAdmin
        .from('questions')
        .insert({
          image_url: imageUrl,
          content: row.content,
          summary,
          status,
          created_at: new Date().toISOString()
        })
        .select('id,image_url,content,summary,status,created_at')
        .single();

      if (questionError || !questionRow) {
        throw questionError || new Error('写入 questions 失败');
      }

      const { data: problemRow, error: problemError } = await supabaseAdmin
        .from('problems')
        .insert({
          user_id: req.user.id,
          title: analysis.title,
          subject: analysis.tags.big,
          difficulty: 'medium',
          time_ago: '刚刚',
          tags: [analysis.tags.big, analysis.tags.mid, analysis.tags.small],
          description: row.content,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (problemError || !problemRow) {
        throw problemError || new Error('写入 problems 失败');
      }

      const getOrCreateFolder = async (title, parentId) => {
        let query = supabaseAdmin
          .from('tree_nodes')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('type', 'folder')
          .eq('title', title);

        if (parentId) {
          query = query.eq('parent_id', parentId);
        } else {
          query = query.is('parent_id', null);
        }

        const { data: existing } = await query.maybeSingle();
        if (existing?.id) return existing.id;

        const { data: created, error: createError } = await supabaseAdmin
          .from('tree_nodes')
          .insert({
            user_id: req.user.id,
            title,
            type: 'folder',
            parent_id: parentId || null,
            sort_order: Date.now()
          })
          .select('id')
          .single();

        if (createError || !created) {
          throw createError || new Error('创建目录失败');
        }

        return created.id;
      };

      const midId = await getOrCreateFolder(analysis.tags.mid, parentFolderId || null);
      const smallId = await getOrCreateFolder(analysis.tags.small, midId);

      const { error: nodeError } = await supabaseAdmin
        .from('tree_nodes')
        .insert({
          user_id: req.user.id,
          title: analysis.title,
          type: 'file',
          parent_id: smallId,
          problem_id: problemRow.id,
          sort_order: Date.now()
        });

      if (nodeError) {
        throw nodeError;
      }

      insertedQuestions.push(questionRow);
    } catch (error) {
      console.error('保存题目失败:', error);
      return res.status(500).json({ message: '保存题目失败' });
    }
  }

  res.json({ questions: insertedQuestions });
});

module.exports = app;
