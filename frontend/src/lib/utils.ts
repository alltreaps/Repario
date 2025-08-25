import { type ClassValue, clsx } from "clsx"
import { cva } from "class-variance-authority"

/**
 * Utility function to merge class names conditionally
 * Combines clsx and class-variance-authority for flexible styling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Re-export cva for component variant creation
 */
export { cva }
