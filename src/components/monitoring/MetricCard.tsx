/**
 * Composant d'affichage de métrique
 */

import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  status: 'ok' | 'warning' | 'error';
  icon: React.ReactNode;
  description?: string;
}

export const MetricCard = ({ title, value, status, icon, description }: MetricCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ok': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={getStatusColor()}>
          {icon}
        </div>
        {getStatusIcon()}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </Card>
  );
};
