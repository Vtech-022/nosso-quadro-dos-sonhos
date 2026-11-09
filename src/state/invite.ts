const KEY = 'nqs:convite'
export const getPendingInvite = () => { try { return localStorage.getItem(KEY) } catch { return null } }
export const setPendingInvite = (c: string) => { try { localStorage.setItem(KEY, c.toUpperCase()) } catch { /* ok */ } }
export const clearPendingInvite = () => { try { localStorage.removeItem(KEY) } catch { /* ok */ } }
