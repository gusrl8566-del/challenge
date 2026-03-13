export const ADMIN_TOKEN_KEY = 'admin_access_token';
const COOKIE_NAME = 'admin_access_token';

export function setAdminSession(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=86400; samesite=lax`;
}

export function clearAdminSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export function hasAdminSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.localStorage.getItem(ADMIN_TOKEN_KEY));
}
