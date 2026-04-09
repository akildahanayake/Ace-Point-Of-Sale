import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkPeriod, Branch } from '../types';
import { posService } from '../services/posService';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  role: string;
  branchId: string;
}

interface AppContextType {
  user: User | null;
  currentBranch: Branch | null;
  branches: Branch[];
  activeWorkPeriod: WorkPeriod | null;
  login: (userData: User) => void;
  logout: () => void;
  switchBranch: (branch: Branch) => void;
  startWorkPeriod: () => Promise<void>;
  endWorkPeriod: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [activeWorkPeriod, setActiveWorkPeriod] = useState<WorkPeriod | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const unsub = posService.subscribeToBranches(setBranches);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user && branches.length > 0 && !currentBranch) {
      const branch = branches.find(b => b.id === user.branchId);
      if (branch) setCurrentBranch(branch);
    }
  }, [user, branches, currentBranch]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setCurrentBranch(null);
    setActiveWorkPeriod(null);
  };

  const switchBranch = (branch: Branch) => {
    setCurrentBranch(branch);
  };

  const startWorkPeriod = async () => {
    if (!user) return;
    try {
      const ref = await posService.startWorkPeriod(user.id);
      if (ref) {
        setActiveWorkPeriod({
          id: ref.id,
          startTime: new Date().toISOString(),
          status: 'open',
          userIdStart: user.id
        });
        toast.success('Work period started');
      }
    } catch (error) {
      toast.error('Failed to start work period');
    }
  };

  const endWorkPeriod = async () => {
    if (!activeWorkPeriod || !user) return;
    try {
      await posService.endWorkPeriod(activeWorkPeriod.id, user.id);
      setActiveWorkPeriod({
        ...activeWorkPeriod,
        endTime: new Date().toISOString(),
        status: 'closed',
        userIdEnd: user.id
      });
      toast.success('Work period closed');
    } catch (error) {
      toast.error('Failed to close work period');
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      currentBranch, 
      branches, 
      activeWorkPeriod,
      login, 
      logout, 
      switchBranch,
      startWorkPeriod,
      endWorkPeriod
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
