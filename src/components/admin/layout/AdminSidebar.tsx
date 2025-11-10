/**
 * AdminSidebar - Barre de navigation latérale
 * Navigation moderne avec icônes et animations
 */

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PlayCircle,
  Music,
  Users,
  Settings,
  Tv,
  FileAudio,
  Image,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    description: 'Vue d\'ensemble',
  },
  {
    id: 'game-control',
    label: 'Contrôle Jeu',
    icon: PlayCircle,
    description: 'Contrôle du quiz',
  },
  {
    id: 'media',
    label: 'Médias',
    icon: Music,
    description: 'Musiques & Jingles',
  },
  {
    id: 'teams',
    label: 'Équipes',
    icon: Users,
    description: 'Gestion équipes',
  },
  {
    id: 'screens',
    label: 'Écrans',
    icon: Tv,
    description: 'Gestion écrans',
  },
];

interface AdminSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

export const AdminSidebar = ({ currentSection, onSectionChange }: AdminSidebarProps) => {
  return (
    <div className="w-64 bg-card/95 backdrop-blur-xl border-r border-border flex flex-col">
      {/* Logo / Branding */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
              ARENA
            </h1>
            <p className="text-xs text-muted-foreground">Régie Professionnelle</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeSection"
                  className="absolute inset-0 bg-primary rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-3 flex-1">
                <Icon className="w-5 h-5" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs opacity-80">{item.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Version 2.0 Pro
        </div>
      </div>
    </div>
  );
};
