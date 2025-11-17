import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useClientSessions } from '@/hooks/useClientSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Music,
  Brain,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function JoinSession() {
  const { accessCode: urlAccessCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { useSessionByCode } = useClientSessions();
  const [manualCode, setManualCode] = useState('');
  const [attemptedCode, setAttemptedCode] = useState(urlAccessCode || '');

  const { data: session, isLoading, error } = useSessionByCode(attemptedCode);

  useEffect(() => {
    // Check if there's a redirect parameter (for after team creation)
    const redirect = searchParams.get('redirect');
    if (redirect === 'client' && session) {
      navigate(`/client?session=${session.id}`);
    }
  }, [searchParams, session, navigate]);

  const handleManualJoin = () => {
    if (manualCode.trim()) {
      setAttemptedCode(manualCode.trim().toUpperCase());
    } else {
      toast.error('Veuillez entrer un code d\'accès');
    }
  };

  const handleJoinSession = () => {
    if (session) {
      // Redirect to Client page with session parameter
      navigate(`/client?session=${session.id}`);
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <Brain className="h-6 w-6" />;
      case 'blindtest':
        return <Music className="h-6 w-6" />;
      case 'mixed':
        return <Sparkles className="h-6 w-6" />;
      default:
        return <Brain className="h-6 w-6" />;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      quiz: 'Quiz',
      blindtest: 'Blindtest',
      mixed: 'Quiz + Blindtest',
    };
    return types[type] || type;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Chargement de la session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No code entered yet - show manual entry form
  if (!attemptedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Rejoindre une Session</CardTitle>
            <CardDescription>
              Entrez le code d'accès fourni par votre animateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="XXXX-YYYY-ZZZZ"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleManualJoin()}
                className="text-center text-lg font-mono"
                maxLength={14}
              />
            </div>
            <Button onClick={handleManualJoin} className="w-full gap-2" size="lg">
              Rejoindre
              <ArrowRight className="h-5 w-5" />
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Vous pouvez aussi scanner le QR code</p>
              <p>fourni par votre animateur</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or session not found
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Session Introuvable</CardTitle>
            <CardDescription>
              Le code <code className="font-mono font-bold">{attemptedCode}</code> n'existe pas ou
              la session est expirée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Vérifiez le code d'accès et réessayez
            </p>
            <Button
              onClick={() => {
                setAttemptedCode('');
                setManualCode('');
              }}
              variant="outline"
              className="w-full"
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session found - show details and join button
  const brandingStyle = {
    '--primary-color': session.branding_primary_color || '#3b82f6',
    '--secondary-color': session.branding_secondary_color || '#8b5cf6',
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4"
      style={brandingStyle}
    >
      <Card className="w-full max-w-2xl shadow-xl">
        {/* Header with branding */}
        <div
          className="h-32 rounded-t-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${session.branding_primary_color} 0%, ${session.branding_secondary_color} 100%)`,
          }}
        >
          {session.branding_logo_url ? (
            <img
              src={session.branding_logo_url}
              alt={session.name}
              className="h-20 object-contain"
            />
          ) : (
            <div className="text-white text-center">
              <div className="text-4xl mb-2">{getSessionTypeIcon(session.session_type)}</div>
              <h1 className="text-2xl font-bold">{session.name}</h1>
            </div>
          )}
        </div>

        <CardHeader className="text-center pb-3">
          <div className="flex justify-center gap-2 mb-2">
            <Badge variant="outline" className="text-lg px-4 py-1">
              {getSessionTypeLabel(session.session_type)}
            </Badge>
            {session.status === 'active' && (
              <Badge variant="default" className="text-lg px-4 py-1">
                En cours
              </Badge>
            )}
          </div>
          <CardTitle className="text-3xl">{session.name}</CardTitle>
          {session.event_description && (
            <CardDescription className="text-base mt-2">
              {session.event_description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.event_date && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(session.event_date), 'PPP', { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.event_date), 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            )}

            {session.event_location && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="text-sm font-medium">{session.event_location}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Capacité</p>
                <p className="text-sm font-medium">Maximum {session.max_teams} équipes</p>
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          {session.custom_instructions && (
            <>
              <Separator />
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Instructions</h3>
                <p className="text-sm whitespace-pre-wrap">{session.custom_instructions}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Join Button */}
          <div className="space-y-3">
            <Button
              onClick={handleJoinSession}
              size="lg"
              className="w-full text-lg h-14 gap-2"
              style={{
                backgroundColor: session.branding_primary_color || '#3b82f6',
              }}
            >
              Rejoindre la Session
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Code de session: <code className="font-mono font-bold">{session.access_code}</code>
            </p>

            {!session.custom_instructions && (
              <div className="text-sm text-muted-foreground space-y-1 mt-4">
                <p className="font-semibold">Comment jouer :</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Cliquez sur "Rejoindre la Session"</li>
                  <li>Créez votre équipe en entrant un nom</li>
                  <li>Attendez que l'animateur démarre le jeu</li>
                  <li>Amusez-vous bien ! 🎉</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
