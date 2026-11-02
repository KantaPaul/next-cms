/**
 * Non-HttpOnly hint that a session cookie exists, kept in sync by the proxy.
 * It only decides whether the public admin bar asks `/api/admin-bar` who is
 * signed in; it grants nothing on its own.
 */
export const ADMIN_BAR_HINT_COOKIE = 'cms_signed_in';

export const ADMIN_BAR_ENDPOINT = '/api/admin-bar';
