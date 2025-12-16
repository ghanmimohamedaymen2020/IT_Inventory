export function requireAdminOrSuperAdmin(session: any) {
  if (!session || !session.user) {
    throw new Error('Non authentifié')
  }

  const role = session.user.role as string | undefined

  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Accès refusé. Requiert rôle admin ou super_admin')
  }

  return true
}

export function requireAuthenticated(session: any) {
  if (!session || !session.user) throw new Error('Non authentifié')
  return true
}

export default { requireAdminOrSuperAdmin, requireAuthenticated }
