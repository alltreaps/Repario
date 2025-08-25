import { type ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { type Ability } from '../lib/permissions';

interface CanProps {
  /** The ability required to render children */
  ability: Ability;
  /** Content to render if user has the ability */
  children: ReactNode;
  /** Optional content to render if user lacks the ability */
  fallback?: ReactNode;
  /** If true, renders nothing instead of fallback when permission is denied */
  silent?: boolean;
}

/**
 * Conditional rendering component based on user permissions
 * 
 * @example
 * <Can ability="users.edit">
 *   <EditUserButton />
 * </Can>
 * 
 * @example
 * <Can ability="invoices.delete" fallback={<DisabledButton />}>
 *   <DeleteInvoiceButton />
 * </Can>
 */
export function Can({ ability, children, fallback = null, silent = false }: CanProps) {
  const { can, isLoading } = usePermissions();
  
  // Don't render anything while loading
  if (isLoading) {
    return null;
  }
  
  // Check if user has the required ability
  if (can(ability)) {
    return <>{children}</>;
  }
  
  // User lacks permission - render fallback or nothing
  return silent ? null : <>{fallback}</>;
}

interface CanAllProps {
  /** Array of abilities - user must have ALL to render children */
  abilities: Ability[];
  /** Content to render if user has all abilities */
  children: ReactNode;
  /** Optional content to render if user lacks any ability */
  fallback?: ReactNode;
  /** If true, renders nothing instead of fallback when permission is denied */
  silent?: boolean;
}

/**
 * Conditional rendering component that requires ALL specified abilities
 * 
 * @example
 * <CanAll abilities={['users.edit', 'users.delete']}>
 *   <AdminUserControls />
 * </CanAll>
 */
export function CanAll({ abilities, children, fallback = null, silent = false }: CanAllProps) {
  const { can, isLoading } = usePermissions();
  
  if (isLoading) {
    return null;
  }
  
  const hasAllAbilities = abilities.every(ability => can(ability));
  
  if (hasAllAbilities) {
    return <>{children}</>;
  }
  
  return silent ? null : <>{fallback}</>;
}

interface CanAnyProps {
  /** Array of abilities - user needs ANY ONE to render children */
  abilities: Ability[];
  /** Content to render if user has any ability */
  children: ReactNode;
  /** Optional content to render if user lacks all abilities */
  fallback?: ReactNode;
  /** If true, renders nothing instead of fallback when permission is denied */
  silent?: boolean;
}

/**
 * Conditional rendering component that requires ANY of the specified abilities
 * 
 * @example
 * <CanAny abilities={['invoices.edit', 'invoices.delete']}>
 *   <InvoiceActions />
 * </CanAny>
 */
export function CanAny({ abilities, children, fallback = null, silent = false }: CanAnyProps) {
  const { can, isLoading } = usePermissions();
  
  if (isLoading) {
    return null;
  }
  
  const hasAnyAbility = abilities.some(ability => can(ability));
  
  if (hasAnyAbility) {
    return <>{children}</>;
  }
  
  return silent ? null : <>{fallback}</>;
}
