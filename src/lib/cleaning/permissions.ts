type Locals = App.Locals;

export function isSuperAdmin(locals: Locals): boolean {
  return locals.profile?.role === 'super_admin';
}

export function isAdmin(locals: Locals): boolean {
  const role = locals.profile?.role;
  return role === 'admin' || role === 'super_admin';
}

export function isOwner(locals: Locals): boolean {
  return locals.profile?.role === 'property_owner';
}

export function requireSession(locals: Locals): Response | null {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return null;
}

export function requireAdmin(locals: Locals): Response | null {
  const unauth = requireSession(locals);
  if (unauth) return unauth;
  if (!isAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return null;
}

export function requireSuperAdmin(locals: Locals): Response | null {
  const unauth = requireSession(locals);
  if (unauth) return unauth;
  if (!isSuperAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return null;
}
