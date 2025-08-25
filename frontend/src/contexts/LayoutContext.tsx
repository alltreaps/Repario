import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface LayoutContextType {
  currentLayoutName: string | null
  setCurrentLayoutName: (name: string | null) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export const useLayoutContext = () => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider')
  }
  return context
}

interface LayoutProviderProps {
  children: ReactNode
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null)

  return (
    <LayoutContext.Provider value={{ currentLayoutName, setCurrentLayoutName }}>
      {children}
    </LayoutContext.Provider>
  )
}
