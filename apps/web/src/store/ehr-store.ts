// This file is deprecated. Use @/lib/store/sessionStore instead.
// Kept as a stub to prevent import errors from legacy component files.

export interface EHRStore {
  [key: string]: unknown;
}

export const useEHRStore = () => ({} as EHRStore);
export default useEHRStore;
