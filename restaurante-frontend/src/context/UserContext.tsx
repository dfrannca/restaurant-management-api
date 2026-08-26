'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';

interface UserContextType {
  currentUser: User | null;
  token: string | null;
  loadingUsers: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client side
    const savedToken = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('current_user');

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
    } else if (pathname !== '/login') {
      router.replace('/login');
    }

    setLoadingUsers(false);
  }, [pathname, router]);

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('current_user');
    setToken(null);
    setCurrentUser(null);
    router.replace('/login');
  };

  return (
    <UserContext.Provider value={{ currentUser, token, loadingUsers, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
