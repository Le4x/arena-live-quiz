import { useParams, useNavigate } from 'react-router-dom';
import { useClientSessions } from '@/hooks/useClientSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QRCodeGenerator } from '@/components/session-manager/QRCodeGenerator';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  FileText,
  Calendar,
  MapPin,
  Users,
  Mail,
  Phone,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function ClientKit() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { useSession } = useClientSessions();
  const { data: session, isLoading } = useSession(sessionId);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Session introuvable</p>
            <Button onClick={() => navigate('/sessions')} className="mt-4">
              Retour aux sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join/${session.access_code}`;

  const copyToClipboard = (text: string, type: 'url' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast.success('Copié dans le presse-papier !');
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Kit Session Client', 20, 20);

    // Session name
    doc.setFontSize(16);
    doc.text(session.name, 20, 35);

    // Separator
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    // Session details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    let yPos = 50;

    if (session.event_date) {
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(session.event_date), 'PPP à HH:mm', { locale: fr }), 60, yPos);
      yPos += 8;
    }

    if (session.event_location) {
      doc.setFont('helvetica', 'bold');
      doc.text('Lieu:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(session.event_location, 60, yPos);
      yPos += 8;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Type:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    const sessionTypes: Record<string, string> = {
      quiz: 'Quiz',
      blindtest: 'Blindtest',
      mixed: 'Quiz + Blindtest',
    };
    doc.text(sessionTypes[session.session_type] || session.session_type, 60, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Équipes max:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(session.max_teams.toString(), 60, yPos);
    yPos += 15;

    // Access information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations de Connexion', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Code d\'accès:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text(session.access_code, 60, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Lien direct:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(joinUrl, 20, yPos + 5);
    yPos += 20;

    // Instructions
    if (session.custom_instructions) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructions', 20, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(session.custom_instructions, 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 6;
    } else {
      // Default instructions
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructions', 20, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const defaultInstructions = [
        '1. Scannez le QR code ci-dessous ou rendez-vous sur le lien',
        '2. Créez votre équipe en entrant un nom',
        '3. Attendez que l\'animateur démarre la session',
        '4. Bonne chance !',
      ];
      defaultInstructions.forEach((instruction) => {
        doc.text(instruction, 20, yPos);
        yPos += 6;
      });
    }

    // Note about QR code
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: Le QR code peut être téléchargé séparément depuis l\'interface web', 20, yPos);

    // Client info if available
    if (session.client_name || session.client_company) {
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Contact Client', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (session.client_company) {
        doc.text(`Entreprise: ${session.client_company}`, 20, yPos);
        yPos += 5;
      }
      if (session.client_name) {
        doc.text(`Contact: ${session.client_name}`, 20, yPos);
        yPos += 5;
      }
      if (session.client_email) {
        doc.text(`Email: ${session.client_email}`, 20, yPos);
        yPos += 5;
      }
      if (session.client_phone) {
        doc.text(`Téléphone: ${session.client_phone}`, 20, yPos);
      }
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Généré par Arena Live Quiz', 20, pageHeight - 10);

    // Save
    doc.save(`Kit-${session.access_code}-${session.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF généré avec succès !');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Kit Client</h1>
          <p className="text-muted-foreground">{session.name}</p>
        </div>
        <Button onClick={generatePDF} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger Kit PDF
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: QR Code */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Session</CardTitle>
              <CardDescription>
                Les joueurs peuvent scanner ce code pour rejoindre directement
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <QRCodeGenerator
                sessionCode={session.access_code}
                sessionName={session.name}
                brandingColor={session.branding_primary_color || '#3b82f6'}
              />
            </CardContent>
          </Card>

          {/* Access Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de Connexion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Code d'accès</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-3 rounded-md font-mono text-lg">
                    {session.access_code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(session.access_code, 'code')}
                  >
                    {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Lien direct</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinUrl}
                    readOnly
                    className="flex-1 bg-muted p-3 rounded-md text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(joinUrl, 'url')}
                  >
                    {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Session Details */}
        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de la Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {session.event_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.event_date), 'PPP à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}

                {session.event_location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Lieu</p>
                      <p className="text-sm text-muted-foreground">{session.event_location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Capacité</p>
                    <p className="text-sm text-muted-foreground">
                      Maximum {session.max_teams} équipes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <Badge variant="outline">
                      {session.session_type === 'quiz'
                        ? 'Quiz'
                        : session.session_type === 'blindtest'
                        ? 'Blindtest'
                        : 'Quiz + Blindtest'}
                    </Badge>
                  </div>
                </div>
              </div>

              {session.event_description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{session.event_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          {(session.client_name || session.client_company) && (
            <Card>
              <CardHeader>
                <CardTitle>Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.client_company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Entreprise</p>
                      <p className="text-sm text-muted-foreground">{session.client_company}</p>
                    </div>
                  </div>
                )}

                {session.client_name && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Contact</p>
                      <p className="text-sm text-muted-foreground">{session.client_name}</p>
                    </div>
                  </div>
                )}

                {session.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{session.client_email}</p>
                    </div>
                  </div>
                )}

                {session.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Téléphone</p>
                      <p className="text-sm text-muted-foreground">{session.client_phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions pour les Joueurs</CardTitle>
            </CardHeader>
            <CardContent>
              {session.custom_instructions ? (
                <p className="text-sm whitespace-pre-wrap">{session.custom_instructions}</p>
              ) : (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. Scannez le QR code ou utilisez le lien</p>
                  <p>2. Créez votre équipe</p>
                  <p>3. Attendez le démarrage de la session</p>
                  <p>4. Bonne chance !</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
