import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  Plus,
  ShoppingCart,
  Barcode,
  Database,
  LogIn,
  LogOut,
} from 'lucide-react';
import { setOperatorProfile, getOperatorProfile } from '../services/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut } from 'firebase/auth';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onOpenScanner: () => void;
  onOpenQuickSale: () => void;
  onOpenStockEntry: () => void;
  lowStockCount?: number;
}

interface OperatorProfile {
  role: string;
  name: string;
  email: string;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileSidebar,
  onOpenScanner,
  onOpenQuickSale,
  onOpenStockEntry,
  lowStockCount = 0,
}) => {
  const [currentProfile, setCurrentProfile] = useState<OperatorProfile>({
    ...getOperatorProfile(),
    title: 'Operations Manager',
  });
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const presetRoles = [
    {
      role: 'admin',
      name: 'System Administrator',
      email: 'admin@stocksystem.local',
      title: 'Admin (Full Privileges)',
    },
    {
      role: 'manager',
      name: 'Operations Manager',
      email: 'manager@stocksystem.local',
      title: 'Operations Manager',
    },
    {
      role: 'sales',
      name: 'Sarah Jenkins (Sales)',
      email: 'sarah@stocksystem.local',
      title: 'Sales & Billing Specialist',
    },
    {
      role: 'stock_clerk',
      name: 'John Doe (Warehouse)',
      email: 'john@stocksystem.local',
      title: 'Warehouse & Stock Clerk',
    },
  ];

  const handleSelectRole = (role: (typeof presetRoles)[0]) => {
    setOperatorProfile(role.role, role.name, role.email);
    setCurrentProfile(role);
    setRoleDropdownOpen(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setFirebaseUser(result.user);
      const name = result.user.displayName || 'Google User';
      const email = result.user.email || 'user@google.com';
      setOperatorProfile('manager', name, email);
      setCurrentProfile({ role: 'manager', name, email, title: 'Google Authenticated' });
      setRoleDropdownOpen(false);
    } catch (err: any) {
      console.warn('Google Sign-in status:', err.message);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      handleSelectRole(presetRoles[1]); // fallback to Operations Manager
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Left items: Mobile Hamburger & System Brand / Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">PostgreSQL DB</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-emerald-400 font-mono text-[10px]">Cloud SQL Active</span>
        </div>
      </div>

      {/* Right items: Quick Action Buttons & Role Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Barcode Scanner Button */}
        <button
          onClick={onOpenScanner}
          className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          title="Open Barcode Scanner"
        >
          <Barcode className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Scan Barcode</span>
        </button>

        {/* Quick Stock In Intake Button */}
        <button
          onClick={onOpenStockEntry}
          className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          title="Add Stock Entry"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Stock In</span>
        </button>

        {/* Quick New Sale / POS Button */}
        <button
          onClick={onOpenQuickSale}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          title="New Sale / POS Counter"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>New Sale (POS)</span>
        </button>

        {/* Role & Operator Switcher Dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
              {currentProfile.name.charAt(0)}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-200 leading-tight">
                {currentProfile.name}
              </div>
              <div className="text-[10px] text-amber-400 font-mono capitalize">
                {currentProfile.role.replace('_', ' ')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Operator Role
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Switch roles to test permission restrictions and audit logging.
                </p>
              </div>

              <div className="space-y-1">
                {presetRoles.map((role) => (
                  <button
                    key={role.role}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      currentProfile.role === role.role
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{role.name}</div>
                      <div
                        className={`text-[10px] ${
                          currentProfile.role === role.role ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {role.title}
                      </div>
                    </div>
                    {currentProfile.role === role.role && (
                      <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Google OAuth Firebase Integration */}
              <div className="mt-2 pt-2 border-t border-slate-800">
                {firebaseUser ? (
                  <button
                    onClick={handleGoogleSignOut}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5" /> Sign out ({firebaseUser.email})
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-blue-400 hover:bg-blue-500/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <LogIn className="w-3.5 h-3.5" /> Sign in with Google
                    </span>
                    <span className="text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">
                      OAuth
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
