/**
 * Frontend Permission Types and Matrix
 * Copied from backend for type safety and client-side permission checks
 */

export type Role = 'admin' | 'manager' | 'user';

export type Ability =
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete' | 'users.changeRole'
  | 'invoices.view' | 'invoices.create' | 'invoices.edit' | 'invoices.delete' | 'invoices.export'
  | 'items.view' | 'items.create' | 'items.edit' | 'items.delete'
  | 'layouts.view' | 'layouts.create' | 'layouts.edit' | 'layouts.delete'
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'business.edit' | 'business.delete' | 'business.transfer';

/**
 * Permission matrix defining what each role can do
 * Must be kept in sync with backend permissions
 */
const matrix: Record<Role, Ability[]> = {
  admin: [
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.changeRole',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.export',
    'items.view', 'items.create', 'items.edit', 'items.delete',
    'layouts.view', 'layouts.create', 'layouts.edit', 'layouts.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'business.edit', 'business.delete', 'business.transfer'
  ],
  manager: [
    'users.view',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.export',
    'items.view', 'items.create', 'items.edit',
    'layouts.view', 'layouts.create', 'layouts.edit',
    'clients.view', 'clients.create', 'clients.edit',
    'business.edit'
  ],
  user: [
    'invoices.view', 'invoices.create',
    'items.view',
    'layouts.view',
    'clients.view'
  ]
};

/**
 * Check if a role has a specific ability
 * @param role - The user's role
 * @param ability - The ability to check
 * @returns true if the role has the ability, false otherwise
 */
export const can = (role: Role, ability: Ability): boolean => {
  return matrix[role]?.includes(ability) ?? false;
};

/**
 * Check if a role has ALL of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has all abilities, false otherwise
 */
export const canAll = (role: Role, abilities: Ability[]): boolean => {
  return abilities.every(ability => can(role, ability));
};

/**
 * Check if a role has ANY of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has any of the abilities, false otherwise
 */
export const canAny = (role: Role, abilities: Ability[]): boolean => {
  return abilities.some(ability => can(role, ability));
};

/**
 * Get all abilities for a given role
 * @param role - The user's role
 * @returns Array of all abilities the role has
 */
export const getAbilities = (role: Role): Ability[] => {
  return matrix[role] ?? [];
};
