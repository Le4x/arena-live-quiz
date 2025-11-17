import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Trash2, Copy, Image as ImageIcon, Music, Loader2, Search, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaFile {
  name: string;
  url: string;
  size?: number;
  createdAt?: string;
}

const AdminMedia = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<MediaFile[]>([]);
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ file: MediaFile; type: 'image' | 'audio' } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
    loadAudio();
  }, []);

  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const { data, error } = await supabase.storage
        .from('question-images')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const imagesWithUrls = data.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size,
          createdAt: file.created_at
        };
      });

      setImages(imagesWithUrls);
    } catch (error: any) {
      console.error('Error loading images:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les images",
        variant: "destructive"
      });
    } finally {
      setLoadingImages(false);
    }
  };

  const loadAudio = async () => {
    setLoadingAudio(true);
    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const audioWithUrls = data.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size,
          createdAt: file.created_at
        };
      });

      setAudioFiles(audioWithUrls);
    } catch (error: any) {
      console.error('Error loading audio:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fichiers audio",
        variant: "destructive"
      });
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Erreur",
            description: `${file.name} n'est pas une image`,
            variant: "destructive"
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
      }

      toast({
        title: "Images uploadées",
        description: `${files.length} image(s) ajoutée(s) avec succès`
      });

      loadImages();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
          toast({
            title: "Erreur",
            description: `${file.name} n'est pas un fichier audio`,
            variant: "destructive"
          });
          continue;
        }

        const cleanName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '-')
          .replace(/-+/g, '-')
          .toLowerCase();
        const fileName = `${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
      }

      toast({
        title: "Fichiers audio uploadés",
        description: `${files.length} fichier(s) ajouté(s) avec succès`
      });

      loadAudio();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      const bucket = fileToDelete.type === 'image' ? 'question-images' : 'audio-files';
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileToDelete.file.name]);

      if (error) throw error;

      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès"
      });

      if (fileToDelete.type === 'image') {
        loadImages();
      } else {
        loadAudio();
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({
      title: "URL copiée",
      description: "L'URL a été copiée dans le presse-papier"
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAudio = audioFiles.filter(audio =>
    audio.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Bibliothèque média
            </h1>
            <p className="text-muted-foreground text-xl mt-2">
              Gérez vos images et fichiers audio
            </p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
        </header>

        {/* Search */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fichier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="images" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Images ({images.length})
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Music className="h-4 w-4" />
              Audio ({audioFiles.length})
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredImages.length} image(s)
              </p>
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Uploader des images
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loadingImages ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Chargement des images...</p>
              </Card>
            ) : filteredImages.length === 0 ? (
              <Card className="p-12 text-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucune image</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Aucune image ne correspond à votre recherche" : "Commencez par uploader des images"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => imageInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Uploader des images
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <Card key={image.name} className="group relative overflow-hidden">
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(image.url)}
                        >
                          {copiedUrl === image.url ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setFileToDelete({ file: image, type: 'image' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate font-medium">{image.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(image.size)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredAudio.length} fichier(s) audio
              </p>
              <div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Uploader des fichiers audio
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loadingAudio ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Chargement des fichiers audio...</p>
              </Card>
            ) : filteredAudio.length === 0 ? (
              <Card className="p-12 text-center">
                <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun fichier audio</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Aucun fichier audio ne correspond à votre recherche" : "Commencez par uploader des fichiers audio"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => audioInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Uploader des fichiers audio
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredAudio.map((audio) => (
                  <Card key={audio.name} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Music className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{audio.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(audio.size)}
                            {audio.createdAt && ` • ${new Date(audio.createdAt).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(audio.url)}
                        >
                          {copiedUrl === audio.url ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              Copié
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copier URL
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFileToDelete({ file: audio, type: 'audio' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier "{fileToDelete?.file.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMedia;
