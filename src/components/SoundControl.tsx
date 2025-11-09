import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const SoundControl = () => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('arena_sound_muted');
    return saved === 'true';
  });

  useEffect(() => {
    // Apply mute state to all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.muted = isMuted;
    });

    // Save preference
    localStorage.setItem('arena_sound_muted', String(isMuted));
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border-2 border-primary/30 hover:bg-card/95 hover:border-primary/50 shadow-lg transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isMuted ? 'Activer le son' : 'Couper le son'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
