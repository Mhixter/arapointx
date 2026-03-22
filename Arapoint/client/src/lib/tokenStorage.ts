const storage = sessionStorage;

export const tokenStorage = {
  getItem: (key: string): string | null => storage.getItem(key),
  setItem: (key: string, value: string): void => storage.setItem(key, value),
  removeItem: (key: string): void => storage.removeItem(key),
};
