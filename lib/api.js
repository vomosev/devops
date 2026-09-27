// lib/api.js
// Browser-side API client for the DevOps Academy backend.
// All functions are called from effects/handlers only — never at module load.

const BASE =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'https://devops-api.arx-app.com:4115';

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status || 0;
    this.details = details || null;
  }
}

function buildUrl(path) {
  const base = String(BASE).replace(/\/+$/, '');
  const suffix = String(path).startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function withQuery(path, params) {
  if (!params || typeof params !== 'object') return path;
  const search = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Internal fetch wrapper.
 * Throws ApiError on non-2xx responses, timeouts or network failures.
 */
async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  if (typeof fetch === 'undefined') {
    throw new ApiError(0, 'Network unavailable in this environment');
  }

  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;

  if (controller && typeof timeout === 'number' && timeout > 0) {
    timer = setTimeout(() => {
      try {
        controller.abort();
      } catch (_) {
        /* noop */
      }
    }, timeout);
  }

  if (signal && controller) {
    if (signal.aborted) {
      controller.abort();
    } else if (typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const finalHeaders = { Accept: 'application/json', ...headers };
  let payload;
  if (body !== undefined && body !== null) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: finalHeaders,
      body: payload,
      signal: controller ? controller.signal : undefined,
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw new ApiError(0, 'The request timed out. Please try again.');
    }
    throw new ApiError(
      0,
      'Unable to reach the API. Check your connection and try again.'
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  const contentType = response.headers && response.headers.get('content-type');
  let data = null;

  if (response.status !== 204) {
    if (contentType && contentType.toLowerCase().includes('application/json')) {
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = text ? { message: text } : null;
      } catch (_) {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function signup({ name, email, password, job_title, jobTitle } = {}) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: {
      name,
      email,
      password,
      job_title: job_title !== undefined ? job_title : jobTitle,
    },
  });
}

export function login({ email, password } = {}) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
  return request('/api/auth/me');
}

export function updateProfile({ name, job_title, jobTitle } = {}) {
  return request('/api/auth/me', {
    method: 'PATCH',
    body: {
      name,
      job_title: job_title !== undefined ? job_title : jobTitle,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Courses & tracks                                                    */
/* ------------------------------------------------------------------ */

export function getTracks() {
  return request('/api/courses/tracks');
}

export function getCourses(filters = {}) {
  const { track, level, q } = filters || {};
  return request(withQuery('/api/courses', { track, level, q }));
}

export function getCourse(slug) {
  if (!slug) {
    return Promise.reject(new ApiError(400, 'A course slug is required'));
  }
  return request(`/api/courses/${encodeURIComponent(slug)}`);
}

export function enroll(slug) {
  if (!slug) {
    return Promise.reject(new ApiError(400, 'A course slug is required'));
  }
  return request(`/api/courses/${encodeURIComponent(slug)}/enroll`, {
    method: 'POST',
  });
}

export function unenroll(slug) {
  if (!slug) {
    return Promise.reject(new ApiError(400, 'A course slug is required'));
  }
  return request(`/api/courses/${encodeURIComponent(slug)}/enroll`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/* Lessons & progress                                                  */
/* ------------------------------------------------------------------ */

export function getLesson(id) {
  if (!id && id !== 0) {
    return Promise.reject(new ApiError(400, 'A lesson id is required'));
  }
  return request(`/api/lessons/${encodeURIComponent(id)}`);
}

export function setLessonProgress(lessonId, status = 'completed') {
  if (!lessonId && lessonId !== 0) {
    return Promise.reject(new ApiError(400, 'A lesson id is required'));
  }
  return request(`/api/progress/lesson/${encodeURIComponent(lessonId)}`, {
    method: 'POST',
    body: { status },
  });
}

export function getCourseProgress(slug) {
  if (!slug) {
    return Promise.reject(new ApiError(400, 'A course slug is required'));
  }
  return request(`/api/progress/course/${encodeURIComponent(slug)}`);
}

export function getDashboard() {
  return request('/api/progress/dashboard');
}

/* ------------------------------------------------------------------ */
/* Quizzes                                                             */
/* ------------------------------------------------------------------ */

export function getQuiz(slug) {
  if (!slug) {
    return Promise.reject(new ApiError(400, 'A course slug is required'));
  }
  return request(`/api/quizzes/course/${encodeURIComponent(slug)}`);
}

export function submitQuiz(quizId, answers) {
  if (!quizId && quizId !== 0) {
    return Promise.reject(new ApiError(400, 'A quiz id is required'));
  }
  return request(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, {
    method: 'POST',
    body: { answers: answers || {} },
  });
}

export function getQuizAttempts(quizId) {
  if (!quizId && quizId !== 0) {
    return Promise.reject(new ApiError(400, 'A quiz id is required'));
  }
  return request(`/api/quizzes/${encodeURIComponent(quizId)}/attempts`);
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export function getHealth() {
  return request('/api/health', { timeout: 8000 });
}

const api = {
  ApiError,
  request,
  signup,
  login,
  logout,
  getMe,
  updateProfile,
  getTracks,
  getCourses,
  getCourse,
  enroll,
  unenroll,
  getLesson,
  setLessonProgress,
  getCourseProgress,
  getDashboard,
  getQuiz,
  submitQuiz,
  getQuizAttempts,
  getHealth,
};

export default api;