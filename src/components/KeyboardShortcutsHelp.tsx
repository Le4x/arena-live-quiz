import { Card } from '@/components/ui/card';
import { Keyboard } from 'lucide-react';

export const KeyboardShortcutsHelp = () => {
  const shortcuts = [
    { key: 'Space', action: 'Start/Pause chrono' },
    { key: 'N', action: 'Question suivante' },
    { key: 'B', action: 'Lock/Unlock buzzer' },
    { key: 'C', action: 'Correct (+points)' },
    { key: 'I', action: 'Incorrect' },
    { key: '← / →', action: '-1 / +1 point' }
  ];

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Raccourcis clavier</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {shortcuts.map(({ key, action }) => (
          <div key={key} className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border text-xs font-mono">
              {key}
            </kbd>
            <span className="text-muted-foreground">{action}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
