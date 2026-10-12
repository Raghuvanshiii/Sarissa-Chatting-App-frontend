export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const sessionToken = sessionStorage.getItem('chat_token');
  if (sessionToken) {
    return sessionToken;
  }

  const localToken = localStorage.getItem('chat_token');
  if (localToken) {
    sessionStorage.setItem('chat_token', localToken);
    return localToken;
  }
  return null;
};

export const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('chat_token', token);
  localStorage.setItem('chat_token', token);
};

export const removeStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('chat_token');
  localStorage.removeItem('chat_token');
};
