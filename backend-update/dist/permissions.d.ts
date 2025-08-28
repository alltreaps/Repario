/**
 * Role-Based Access Control (RBAC) Permission Matrix
 * Defines granular permissions for different user roles
 */
export type Role = 'admin' | 'manager' | 'user';
export type Ability = 'users.view' | 'users.create' | 'users.edit' | 'users.delete' | 'users.changeRole' | 'invoices.view' | 'invoices.create' | 'invoices.edit' | 'invoices.delete' | 'items.view' | 'items.create' | 'items.edit' | 'items.delete' | 'layouts.view' | 'layouts.create' | 'layouts.edit' | 'layouts.delete' | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete';
/**
 * Check if a role has a specific ability
 * @param role - The user's role
 * @param ability - The ability to check
 * @returns true if the role has the ability, false otherwise
 */
export declare const can: (role: Role, ability: Ability) => boolean;
/**
 * Check if a role has ALL of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has all abilities, false otherwise
 */
export declare const canAll: (role: Role, abilities: Ability[]) => boolean;
/**
 * Check if a role has ANY of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has any of the abilities, false otherwise
 */
export declare const canAny: (role: Role, abilities: Ability[]) => boolean;
/**
 * Get all abilities for a given role
 * @param role - The user's role
 * @returns Array of all abilities the role has
 */
export declare const getAbilities: (role: Role) => Ability[];
/**
 * Check if one role has equal or higher permissions than another
 * @param userRole - The role to check
 * @param requiredRole - The minimum required role
 * @returns true if userRole has equal or higher permissions
 */
export declare const hasRoleLevel: (userRole: Role, requiredRole: Role) => boolean;
/**
 * Express middleware factory for ability-based route protection
 * @param ability - The required ability
 * @returns Express middleware function
 */
export declare const requireAbility: (ability: Ability) => (req: any, res: any, next: any) => any;
/**
 * Express middleware factory for multiple ability checks (ALL required)
 * @param abilities - Array of required abilities (all must be present)
 * @returns Express middleware function
 */
export declare const requireAllAbilities: (abilities: Ability[]) => (req: any, res: any, next: any) => any;
/**
 * Express middleware factory for multiple ability checks (ANY required)
 * @param abilities - Array of abilities (at least one must be present)
 * @returns Express middleware function
 */
export declare const requireAnyAbility: (abilities: Ability[]) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=permissions.d.ts.map