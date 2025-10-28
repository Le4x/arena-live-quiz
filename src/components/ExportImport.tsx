import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { exportState, importState } from '@/lib/realtime';
import { useToast } from '@/hooks/use-toast';

export const ExportImport = () => {
  const { toast } = useToast();
  const baseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

  const handleExport = async () => {
    try {
      const state = await exportState(baseUrl);
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arena-live-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '✅ Export réussi' });
    } catch (error) {
      toast({ title: '❌ Erreur export', variant: 'destructive' });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const state = JSON.parse(text);
        await importState(baseUrl, state);
        toast({ title: '✅ Import réussi', description: 'Rechargez la page' });
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        toast({ title: '❌ Erreur import', variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExport} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export JSON
      </Button>
      <Button onClick={handleImport} variant="outline" size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Import JSON
      </Button>
    </div>
  );
};
