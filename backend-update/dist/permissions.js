"use strict";
/**
 * Role-Based Access Control (RBAC) Permission Matrix
 * Defines granular permissions for different user roles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnyAbility = exports.requireAllAbilities = exports.requireAbility = exports.hasRoleLevel = exports.getAbilities = exports.canAny = exports.canAll = exports.can = void 0;
/**
 * Permission matrix defining what each role can do
 * Organized by role hierarchy: user < manager < admin
 */
const matrix = {
    admin: [
        // Full user management permissions
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.changeRole',
        // Full invoice management
        'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
        // Full item management
        'items.view', 'items.create', 'items.edit', 'items.delete',
        // Full layout management
        'layouts.view', 'layouts.create', 'layouts.edit', 'layouts.delete',
        // Full client management
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete'
    ],
    manager: [
        // Can view users but not create/delete or change roles
        'users.view',
        // Can manage invoices except delete
        'invoices.view', 'invoices.create', 'invoices.edit',
        // Can manage items except delete
        'items.view', 'items.create', 'items.edit',
        // Can manage layouts except delete
        'layouts.view', 'layouts.create', 'layouts.edit',
        // Can manage clients except delete
        'clients.view', 'clients.create', 'clients.edit'
    ],
    user: [
        // Basic invoice operations
        'invoices.view', 'invoices.create',
        // View-only for items
        'items.view',
        // View-only for layouts
        'layouts.view',
        // View-only for clients
        'clients.view'
    ]
};
/**
 * Check if a role has a specific ability
 * @param role - The user's role
 * @param ability - The ability to check
 * @returns true if the role has the ability, false otherwise
 */
const can = (role, ability) => {
    return matrix[role]?.includes(ability) ?? false;
};
exports.can = can;
/**
 * Check if a role has ALL of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has all abilities, false otherwise
 */
const canAll = (role, abilities) => {
    return abilities.every(ability => (0, exports.can)(role, ability));
};
exports.canAll = canAll;
/**
 * Check if a role has ANY of the specified abilities
 * @param role - The user's role
 * @param abilities - Array of abilities to check
 * @returns true if the role has any of the abilities, false otherwise
 */
const canAny = (role, abilities) => {
    return abilities.some(ability => (0, exports.can)(role, ability));
};
exports.canAny = canAny;
/**
 * Get all abilities for a given role
 * @param role - The user's role
 * @returns Array of all abilities the role has
 */
const getAbilities = (role) => {
    return matrix[role] ?? [];
};
exports.getAbilities = getAbilities;
/**
 * Check if one role has equal or higher permissions than another
 * @param userRole - The role to check
 * @param requiredRole - The minimum required role
 * @returns true if userRole has equal or higher permissions
 */
const hasRoleLevel = (userRole, requiredRole) => {
    const roleHierarchy = {
        user: 0,
        manager: 1,
        admin: 2
    };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
exports.hasRoleLevel = hasRoleLevel;
/**
 * Express middleware factory for ability-based route protection
 * @param ability - The required ability
 * @returns Express middleware function
 */
const requireAbility = (ability) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!(0, exports.can)(user.role, ability)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: ability,
                userRole: user.role
            });
        }
        next();
    };
};
exports.requireAbility = requireAbility;
/**
 * Express middleware factory for multiple ability checks (ALL required)
 * @param abilities - Array of required abilities (all must be present)
 * @returns Express middleware function
 */
const requireAllAbilities = (abilities) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!(0, exports.canAll)(user.role, abilities)) {
            const missing = abilities.filter(ability => !(0, exports.can)(user.role, ability));
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: abilities,
                missing: missing,
                userRole: user.role
            });
        }
        next();
    };
};
exports.requireAllAbilities = requireAllAbilities;
/**
 * Express middleware factory for multiple ability checks (ANY required)
 * @param abilities - Array of abilities (at least one must be present)
 * @returns Express middleware function
 */
const requireAnyAbility = (abilities) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!(0, exports.canAny)(user.role, abilities)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: abilities,
                userRole: user.role
            });
        }
        next();
    };
};
exports.requireAnyAbility = requireAnyAbility;
//# sourceMappingURL=permissions.js.map