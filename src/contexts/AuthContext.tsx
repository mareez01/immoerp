import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // For demo purposes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: '1',
    name: 'Admin User',
    email: 'admin@amcerp.com',
    role: 'admin',
    department: 'Management',
    phone: '+91 9876543210',
    active: true,
    created_at: new Date().toISOString(),
  },
  technician: {
    id: '2',
    name: 'Tech Support',
    email: 'tech@amcerp.com',
    role: 'technician',
    department: 'Technical',
    phone: '+91 9876543211',
    active: true,
    created_at: new Date().toISOString(),
  },
  support: {
    id: '3',
    name: 'Customer Support',
    email: 'support@amcerp.com',
    role: 'support',
    department: 'Support',
    phone: '+91 9876543212',
    active: true,
    created_at: new Date().toISOString(),
  },
  bookkeeping: {
    id: '4',
    name: 'Accounts Manager',
    email: 'accounts@amcerp.com',
    role: 'bookkeeping',
    department: 'Finance',
    phone: '+91 9876543213',
    active: true,
    created_at: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedRole = localStorage.getItem('demo_role') as UserRole | null;
    if (savedRole && mockUsers[savedRole]) {
      setUser(mockUsers[savedRole]);
    } else {
      // Default to admin for demo
      setUser(mockUsers.admin);
      localStorage.setItem('demo_role', 'admin');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login - in production, this would call Supabase Auth
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const role = Object.keys(mockUsers).find(
      key => mockUsers[key as UserRole].email === email
    ) as UserRole | undefined;
    
    if (role) {
      setUser(mockUsers[role]);
      localStorage.setItem('demo_role', role);
    } else {
      throw new Error('Invalid credentials');
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo_role');
  };

  const switchRole = (role: UserRole) => {
    setUser(mockUsers[role]);
    localStorage.setItem('demo_role', role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
