export function requireAdminOrSuperAdmin(session: any) {
  if (!session || !session.user) {
    throw new Error('Non authentifié')
  }

  const role = session.user.role as string | undefined

  // Accept both legacy 'admin' and 'company_admin' as company-level admins
  if (role !== 'admin' && role !== 'company_admin' && role !== 'super_admin') {
    throw new Error('Accès refusé. Requiert rôle admin, company_admin ou super_admin')
  }

  return true
}

export function requireSuperAdmin(session: any) {
  if (!session || !session.user) {
    throw new Error('Non authentifié')
  }

  const role = session.user.role as string | undefined
  if (role !== 'super_admin') {
    throw new Error('Accès refusé. Requiert rôle super_admin')
  }

  return true
}

export function requireAuthenticated(session: any) {
  if (!session || !session.user) throw new Error('Non authentifié')
  return true
}

export default { requireAdminOrSuperAdmin, requireAuthenticated, requireSuperAdmin }
