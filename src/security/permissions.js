// src/security/permissions.js — Matriz de Permissões por Perfil Operacional
import { AuthorizationError } from '../utils/errors.js';

export const PERMISSIONS = {
  Chefia: [
    'view_fleet',
    'register_km',
    'report_anomaly',
    'resolve_anomaly',
    'submit_hygiene',
    'submit_checklist',
    'submit_maintenance',
    'view_stock',
    'manage_stock',
    'manage_users',
    'view_audit'
  ],
  Motorista: [
    'view_fleet',
    'register_km',
    'report_anomaly',
    'submit_checklist',
    'view_my_records'
  ],
  Oficina: [
    'view_fleet',
    'report_anomaly',
    'resolve_anomaly',
    'submit_maintenance',
    'view_stock',
    'manage_stock'
  ],
  Vigilante: [
    'view_fleet',
    'submit_hygiene',
    'report_anomaly'
  ],
  Secretaria: [
    'view_fleet',
    'view_stock',
    'manage_stock',
    'view_audit'
  ]
};

/**
 * Valida se um utilizador possui uma permissão específica
 */
export function hasPermission(userRole, requiredPermission) {
  if (!userRole) return false;
  const userPerms = PERMISSIONS[userRole] || [];
  return userPerms.includes(requiredPermission);
}

/**
 * Garante que o utilizador tem a permissão necessária ou lança AuthorizationError
 */
export function enforcePermission(user, requiredPermission, actionName = 'esta operação') {
  if (!user) {
    throw new AuthorizationError('Acesso bloqueado: Utilizador não identificado ou não autorizado.');
  }

  if (!hasPermission(user.role, requiredPermission)) {
    throw new AuthorizationError(
      `Permissão negada: O teu perfil (${user.role}) não tem autorização para ${actionName}.`
    );
  }

  return true;
}

export default {
  PERMISSIONS,
  hasPermission,
  enforcePermission
};
