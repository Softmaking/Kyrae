export type AdminMenuIcon =
  | 'dashboard'
  | 'assistant'
  | 'organizations'
  | 'branches'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'audit'
  | 'configuration';

export interface AdminMenuItem {
  readonly label: string;
  readonly route: string;
  readonly icon: AdminMenuIcon;
  readonly description: string;
  readonly requiredPermissions?: readonly string[];
}

export interface AdminMenuSection {
  readonly label: string;
  readonly items: readonly AdminMenuItem[];
}

export const ADMIN_MENU: readonly AdminMenuSection[] = [
  {
    label: 'Administracion',
    items: [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        description: 'Resumen general del sistema',
      },
      {
        label: 'Asistente',
        route: '/assistant',
        icon: 'assistant',
        description: 'Chat web con OpenClaw',
        requiredPermissions: ['ASSISTANT_CHAT_USE'],
      },
      {
        label: 'Organizaciones',
        route: '/organizations',
        icon: 'organizations',
        description: 'Gestion de organizaciones',
        requiredPermissions: ['ORGANIZATIONS_READ'],
      },
      {
        label: 'Sucursales',
        route: '/branches',
        icon: 'branches',
        description: 'Gestion de sucursales',
        requiredPermissions: ['BRANCHES_READ'],
      },
      {
        label: 'Usuarios',
        route: '/users',
        icon: 'users',
        description: 'Gestion de usuarios',
        requiredPermissions: ['USERS_READ'],
      },
      {
        label: 'Roles',
        route: '/roles',
        icon: 'roles',
        description: 'Gestion de roles y permisos',
        requiredPermissions: ['ROLES_READ'],
      },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      {
        label: 'Permisos',
        route: '/permissions',
        icon: 'permissions',
        description: 'Catalogos de permisos del sistema',
        requiredPermissions: ['PERMISSIONS_READ'],
      },
      {
        label: 'Auditoria',
        route: '/audit',
        icon: 'audit',
        description: 'Eventos y trazabilidad',
        requiredPermissions: ['AUDIT_READ'],
      },
      {
        label: 'Configuracion',
        route: '/configuration',
        icon: 'configuration',
        description: 'Gestion de parametros del sistema',
        requiredPermissions: ['CONFIGURATION_READ'],
      },
    ],
  },
];
