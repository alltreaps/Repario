import { type ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { type Ability } from '../lib/permissions';

interface ActionIfProps {
  /** The ability required to render children */
  ability: Ability;
  /** Content to render if user has the ability */
  children: ReactNode;
  /** Optional content to render if user lacks the ability */
  fallback?: ReactNode;
}

/**
 * Conditional rendering component for actions based on user abilities
 * Simpler alternative to Can component with default null fallback
 * 
 * @example
 * <ActionIf ability="users.create">
 *   <CreateButton />
 * </ActionIf>
 * 
 * @example
 * <ActionIf ability="invoices.delete" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </ActionIf>
 */
export default function ActionIf({ ability, children, fallback = null }: ActionIfProps) {
  const { can } = usePermissions();
  
  return can(ability) ? <>{children}</> : <>{fallback}</>;
}
