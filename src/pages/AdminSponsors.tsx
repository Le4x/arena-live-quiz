import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SponsorCard } from "@/components/admin/SponsorCard";
import { SponsorDialog } from "@/components/admin/SponsorDialog";

const AdminSponsors = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<any | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      loadSponsors();
    }
  }, [sessionId]);

  const loadSession = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (data) setSession(data);
  };

  const loadSponsors = async () => {
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .eq('game_session_id', sessionId)
      .order('tier', { ascending: true })
      .order('display_order', { ascending: true });
    
    if (data) setSponsors(data);
  };

  const handleCreate = () => {
    setSelectedSponsor(null);
    setDialogOpen(true);
  };

  const handleEdit = (sponsor: any) => {
    setSelectedSponsor(sponsor);
    setDialogOpen(true);
  };

  const handleDelete = async (sponsorId: string) => {
    try {
      await supabase.from('sponsors').delete().eq('id', sponsorId);
      toast({ title: "✅ Sponsor supprimé" });
      loadSponsors();
    } catch (error: any) {
      toast({ 
        title: "❌ Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const majorSponsors = sponsors.filter(s => s.tier === 'major');
  const mediumSponsors = sponsors.filter(s => s.tier === 'medium');
  const minorSponsors = sponsors.filter(s => s.tier === 'minor');

  return (
    <div className="min-h-screen bg-gradient-glow p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-arena bg-clip-text text-transparent">
              Sponsors
            </h1>
            {session && (
              <p className="text-muted-foreground text-xl mt-2">
                Session: {session.name}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreate} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un sponsor
            </Button>
            <Button onClick={() => navigate('/admin/sessions')} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
          </div>
        </header>

        {sponsors.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-2xl font-bold mb-2">Aucun sponsor</h3>
            <p className="text-muted-foreground mb-6">
              Ajoutez vos premiers sponsors pour cette session
            </p>
            <Button onClick={handleCreate} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un sponsor
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {majorSponsors.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  🏆 Sponsors Majeurs
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {majorSponsors.map(sponsor => (
                    <SponsorCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      onEdit={() => handleEdit(sponsor)}
                      onDelete={() => handleDelete(sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {mediumSponsors.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  ⭐ Sponsors Moyens
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediumSponsors.map(sponsor => (
                    <SponsorCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      onEdit={() => handleEdit(sponsor)}
                      onDelete={() => handleDelete(sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {minorSponsors.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  📌 Sponsors Mineurs
                </h2>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {minorSponsors.map(sponsor => (
                    <SponsorCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      onEdit={() => handleEdit(sponsor)}
                      onDelete={() => handleDelete(sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SponsorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sponsor={selectedSponsor}
        sessionId={sessionId!}
        onSuccess={loadSponsors}
      />
    </div>
  );
};

export default AdminSponsors;
