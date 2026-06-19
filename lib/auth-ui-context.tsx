"use client"

import { createContext, useContext, type ReactNode } from "react"

type AuthUiContextValue = {
  /** Open the sign-in / sign-up screen (from AppGate). */
  openSignIn: () => void
}

const AuthUiContext = createContext<AuthUiContextValue>({
  openSignIn: () => {},
})

export function AuthUiProvider({
  openSignIn,
  children,
}: {
  openSignIn: () => void
  children: ReactNode
}) {
  return (
    <AuthUiContext.Provider value={{ openSignIn }}>
      {children}
    </AuthUiContext.Provider>
  )
}

export function useAuthUi() {
  return useContext(AuthUiContext)
}
