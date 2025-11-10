/**
 * MediaManager - Gestionnaire de médias professionnel
 * Upload, gestion et organisation des musiques/jingles
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AssetUploader } from './AssetUploader';
import { MusicLibrary } from './MusicLibrary';
import { JingleManager } from './JingleManager';
import { Music, Radio, Upload, Library } from 'lucide-react';

interface MediaAsset {
  id: string;
  name: string;
  description?: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  duration_ms?: number;
  storage_path: string;
  public_url?: string;
  category: string;
  tags?: string[];
  event_trigger?: string;
  artist?: string;
  album?: string;
  is_active: boolean;
  created_at: string;
}

export const MediaManager = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload');

  // Charger les assets
  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('file_type', 'audio')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Erreur chargement assets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les médias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();

    // S'abonner aux changements
    const channel = supabase
      .channel('media-assets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_assets',
        },
        () => {
          loadAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const musicAssets = assets.filter(a => a.category === 'background_music');
  const jingleAssets = assets.filter(a => a.category.startsWith('jingle_'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
            Gestionnaire de Médias
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload et gestion de vos musiques, jingles et sons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Card className="px-4 py-2 bg-primary/10 border-primary/30">
            <div className="text-xs text-muted-foreground">Total fichiers</div>
            <div className="text-2xl font-black text-primary">{assets.length}</div>
          </Card>
          <Card className="px-4 py-2 bg-secondary/10 border-secondary/30">
            <div className="text-xs text-muted-foreground">Musiques</div>
            <div className="text-2xl font-black text-secondary">{musicAssets.length}</div>
          </Card>
          <Card className="px-4 py-2 bg-accent/10 border-accent/30">
            <div className="text-xs text-muted-foreground">Jingles</div>
            <div className="text-2xl font-black text-accent">{jingleAssets.length}</div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="music" className="gap-2">
            <Music className="w-4 h-4" />
            Musiques
          </TabsTrigger>
          <TabsTrigger value="jingles" className="gap-2">
            <Radio className="w-4 h-4" />
            Jingles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <AssetUploader onUploadComplete={loadAssets} />
        </TabsContent>

        <TabsContent value="music" className="mt-6">
          <MusicLibrary assets={musicAssets} onUpdate={loadAssets} />
        </TabsContent>

        <TabsContent value="jingles" className="mt-6">
          <JingleManager assets={jingleAssets} onUpdate={loadAssets} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
