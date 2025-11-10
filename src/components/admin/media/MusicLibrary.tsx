/**
 * MusicLibrary - Bibliothèque de musiques
 * Affichage, lecture, gestion des musiques de fond
 */

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  Music,
  Trash2,
  Search,
  Volume2,
  VolumeX,
  Clock,
  HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MediaAsset {
  id: string;
  name: string;
  description?: string;
  duration_ms?: number;
  file_size: number;
  public_url?: string;
  artist?: string;
  created_at: string;
}

interface MusicLibraryProps {
  assets: MediaAsset[];
  onUpdate: () => void;
}

export const MusicLibrary = ({ assets, onUpdate }: MusicLibraryProps) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filtrer assets
  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.artist?.toLowerCase().includes(search.toLowerCase())
  );

  // Player audio
  const playAudio = (asset: MediaAsset) => {
    if (!asset.public_url) return;

    if (playing === asset.id) {
      // Pause
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.src = asset.public_url;
        audioRef.current.play();
        setPlaying(asset.id);
      }
    }
  };

  // Audio ended
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const handleEnded = () => setPlaying(null);
    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
      audioRef.current?.removeEventListener('ended', handleEnded);
      audioRef.current?.pause();
    };
  }, []);

  // Mute/Unmute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  // Supprimer asset
  const handleDelete = async (assetId: string) => {
    try {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;

      // Supprimer de la BDD
      const { error: dbError } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) throw dbError;

      // Supprimer du storage
      const storagePath = asset.public_url?.split('/').slice(-2).join('/');
      if (storagePath) {
        await supabase.storage.from('media').remove([storagePath]);
      }

      toast({
        title: 'Supprimé',
        description: `${asset.name} a été supprimé`,
      });

      onUpdate();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le fichier',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Format durée
  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format taille
  const formatSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une musique..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setMuted(!muted)}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Liste musiques */}
      {filteredAssets.length === 0 ? (
        <Card className="p-12 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucune musique</h3>
          <p className="text-sm text-muted-foreground">
            {search
              ? 'Aucun résultat pour votre recherche'
              : 'Uploadez votre première musique !'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold truncate" title={asset.name}>
                        {asset.name}
                      </h4>
                      {asset.artist && (
                        <p className="text-sm text-muted-foreground truncate">
                          {asset.artist}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => setDeleteConfirm(asset.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-3 mb-3">
                    <Button
                      variant={playing === asset.id ? 'default' : 'outline'}
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => playAudio(asset)}
                    >
                      {playing === asset.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(asset.duration_ms)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HardDrive className="w-3 h-3" />
                        {formatSize(asset.file_size)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {asset.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {asset.description}
                    </p>
                  )}

                  {/* Date */}
                  <div className="text-xs text-muted-foreground mt-2">
                    Ajouté le {new Date(asset.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  {/* Playing indicator */}
                  {playing === asset.id && (
                    <motion.div
                      className="mt-2 flex items-center gap-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-primary rounded-full"
                          animate={{
                            height: [8, 16, 8],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                      <span className="text-xs text-primary ml-2">En lecture</span>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette musique ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier sera définitivement supprimé du
              stockage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
