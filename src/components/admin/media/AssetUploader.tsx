/**
 * AssetUploader - Composant d'upload de fichiers audio
 * Drag & drop, progress bar, validation
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, Music, FileAudio, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface AssetUploaderProps {
  onUploadComplete?: () => void;
}

const CATEGORIES = [
  { value: 'background_music', label: 'Musique de fond' },
  { value: 'jingle_intro', label: 'Jingle - Intro manche' },
  { value: 'jingle_reveal_correct', label: 'Jingle - Bonne réponse' },
  { value: 'jingle_reveal_incorrect', label: 'Jingle - Mauvaise réponse' },
  { value: 'jingle_leaderboard', label: 'Jingle - Classement' },
  { value: 'jingle_final', label: 'Jingle - Finale' },
  { value: 'sound_effect', label: 'Effet sonore' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];

export const AssetUploader = ({ onUploadComplete }: AssetUploaderProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('background_music');
  const [artist, setArtist] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Validation du fichier
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Format non supporté. Utilisez MP3, WAV, OGG ou AAC' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Fichier trop volumineux (max 50MB)' };
    }
    return { valid: true };
  };

  // Gérer la sélection de fichier
  const handleFileSelect = (selectedFile: File) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast({
        title: 'Erreur',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    // Auto-remplir le nom si vide
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // Drag & Drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Upload
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un fichier',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez donner un nom au fichier',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
      const filePath = `audio/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(50);

      // 2. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 3. Obtenir la durée de l'audio
      const audioDuration = await getAudioDuration(file);

      setUploadProgress(75);

      // 4. Créer l'entrée en BDD
      const { data: user } = await supabase.auth.getUser();

      const { error: dbError } = await supabase.from('media_assets').insert({
        name: name.trim(),
        description: description.trim() || null,
        file_type: 'audio',
        mime_type: file.type,
        file_size: file.size,
        duration_ms: audioDuration,
        storage_path: filePath,
        storage_bucket: 'media',
        public_url: publicUrl,
        category,
        artist: artist.trim() || null,
        is_active: true,
        user_id: user.user?.id,
      });

      if (dbError) {
        // Supprimer le fichier du storage si échec BDD
        await supabase.storage.from('media').remove([filePath]);
        throw dbError;
      }

      setUploadProgress(100);

      toast({
        title: 'Succès',
        description: `${name} a été uploadé avec succès !`,
      });

      // Reset form
      setFile(null);
      setName('');
      setDescription('');
      setArtist('');
      setCategory('background_music');
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.();
    } catch (error: any) {
      console.error('Erreur upload:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de l\'upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Obtenir la durée audio
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.floor(audio.duration * 1000)); // En millisecondes
      });
      audio.addEventListener('error', () => {
        resolve(0); // Si erreur, durée inconnue
      });
      audio.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <Card
        className={`relative border-2 border-dashed transition-all ${
          dragActive
            ? 'border-primary bg-primary/5'
            : file
            ? 'border-green-500 bg-green-500/5'
            : 'border-muted'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-12">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {!file ? (
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <Upload className="w-16 h-16 text-muted-foreground mx-auto" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">
                Glissez votre fichier audio ici
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner (MP3, WAV, OGG, AAC - max 50MB)
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Sélectionner un fichier
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{file.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Formulaire métadonnées */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Informations du fichier</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Intro Manche Rock"
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select value={category} onValueChange={setCategory} disabled={uploading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artiste / Source</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex: Nom de l'artiste"
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  rows={3}
                  disabled={uploading}
                />
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Upload en cours...</span>
                    <span className="font-semibold">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !name.trim()}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Uploader
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  Annuler
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
