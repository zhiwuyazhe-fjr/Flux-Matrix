const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const TOKEN_KEY = 'spb_access_token';

export const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = '请求失败';
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const apiLogin = (payload: { email: string; password: string }) => {
  return request<{ token: string; profile: { name: string; email: string; avatar?: string; plan: 'free' | 'pro' } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify(payload) }
  );
};

export const apiRegister = (payload: { name: string; email: string; password: string }) => {
  return request<{ token: string; profile: { name: string; email: string; avatar?: string; plan: 'free' | 'pro' } }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify(payload) }
  );
};

export const apiBootstrap = () => {
  return request<{
    profile: { name: string; email: string; avatar?: string; plan: 'free' | 'pro' };
    problems: Array<{ id: string; title: string; subject: string; difficulty: 'easy' | 'medium' | 'hard'; timeAgo: string; tags: string[]; description?: string }>;
    tree: Array<{ id: string; title: string; type: 'folder' | 'file'; problemId?: string; children?: any[] }>;
    favorites: string[];
  }>('/api/bootstrap');
};

export const apiToggleFavorite = (problemId: string) => {
  return request<{ favorites: string[] }>('/api/favorites/toggle', {
    method: 'POST',
    body: JSON.stringify({ problemId })
  });
};

export const apiAddFolder = (payload: { title: string; parentId?: string | null }) => {
  return request<{ node: { id: string; title: string; type: 'folder'; children: any[] } }>('/api/folders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const apiDeleteNode = (nodeId: string) => {
  return request<{ deletedIds: string[]; deletedProblemIds: string[] }>(`/api/nodes/${nodeId}`, { method: 'DELETE' });
};

export const apiDeleteNodesBatch = (nodeIds: string[]) => {
  return request<{ deletedIds: string[]; deletedProblemIds: string[] }>('/api/nodes/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ nodeIds })
  });
};

export const apiDeleteProblem = (problemId: string) => {
  return request<{ deletedId: string }>(`/api/problems/${problemId}`, { method: 'DELETE' });
};

export const apiDeleteProblemsBatch = (problemIds: string[]) => {
  return request<{ deletedProblemIds: string[] }>('/api/problems/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ problemIds })
  });
};

export const apiUpdateProfile = (payload: { name?: string; email?: string; avatar?: string; plan?: 'free' | 'pro' }) => {
  return request<{ profile: { name: string; email: string; avatar?: string; plan: 'free' | 'pro' } }>('/api/profile', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const apiChangePassword = (payload: { currentPassword: string; newPassword: string }) => {
  return request<{ success: boolean }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const apiUploadAvatar = (payload: { dataUrl: string }) => {
  return request<{ avatarUrl: string; profile: { name: string; email: string; avatar?: string; plan: 'free' | 'pro' } }>(
    '/api/avatar',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
};

export const apiImportQuestion = (payload: { dataUrl: string }) => {
  return request<{ question: { id: string; image_url: string; summary: string; status: string; created_at: string } }>(
    '/api/import-question',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
};

export const apiFetchQuestions = () => {
  return request<{ questions: Array<{ id: string; image_url: string; summary?: string; content?: string; status: string; created_at: string }> }>(
    '/api/questions'
  );
};

export const apiAnalyzeImport = (payload: { dataUrl: string }) => {
  return request<{ imageUrl: string; candidates: Array<{ content: string }> }>(
    '/api/import-questions/analyze',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
};

export const apiSaveQuestions = (payload: { imageUrl: string; items: Array<{ content: string }>; parentFolderId?: string | null }) => {
  return request<{ questions: Array<{ id: string; image_url: string; content: string; status: string; created_at: string }> }>(
    '/api/questions/batch',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
};

export const apiAnalyzeQuestionText = (payload: { questionText: string }) => {
  return request<{ result: any }>('/api/analyze-question', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
