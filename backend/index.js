require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('缺少环境变量：SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

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
    .select('id,parent_id')
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

  if (toDelete.length > 0) {
    await supabaseAdmin
      .from('tree_nodes')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
  }

  res.json({ deletedIds: toDelete });
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

module.exports = app;
