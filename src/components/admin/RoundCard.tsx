import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Music, Clock, ListChecks, ChevronDown, ChevronUp, Plus, Copy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface RoundCardProps {
  round: any;
  questions: any[];
  onEdit: (round: any) => void;
  onDelete: (roundId: string) => void;
  onEditQuestion?: (question: any) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onDuplicateQuestion?: (question: any) => void;
  onCreateQuestion?: () => void;
}

export const RoundCard = ({ 
  round, 
  questions, 
  onEdit, 
  onDelete, 
  onEditQuestion, 
  onDeleteQuestion, 
  onDuplicateQuestion,
  onCreateQuestion 
}: RoundCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blind_test':
        return '🎵 Blind Test';
      case 'qcm':
        return '📋 QCM';
      case 'free_text':
        return '✍️ Texte libre';
      default:
        return type;
    }
  };

  return (
    <>
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-secondary/20 hover:border-secondary/40 transition-all animate-fade-in">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{round.title} - {getTypeLabel(round.type)}</h3>
                {questions.length > 0 && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  {getTypeLabel(round.type)}
                </Badge>
                {round.timer_duration && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {round.timer_duration}s
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`gap-1 ${questions.length > 0 ? 'bg-primary/10 cursor-pointer hover:bg-primary/20' : ''}`}
                  onClick={() => questions.length > 0 && setIsOpen(!isOpen)}
                >
                  <ListChecks className="h-3 w-3" />
                  {questions.length} question{questions.length > 1 ? 's' : ''}
                </Badge>
                {round.jingle_url && (
                  <Badge variant="outline" className="gap-1 bg-secondary/10">
                    <Music className="h-3 w-3" />
                    Jingle
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(round)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {round.created_at && (
            <p className="text-xs text-muted-foreground mb-2">
              Créée le {new Date(round.created_at).toLocaleDateString('fr-FR')}
            </p>
          )}

          <CollapsibleContent className="space-y-2 mt-4 pt-4 border-t border-border">
            {questions.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">Questions de cette manche</p>
                  {onCreateQuestion && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onCreateQuestion}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {questions.map((question) => (
                    <div 
                      key={question.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{question.question_text}</p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getTypeLabel(question.question_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-green-600">+{question.points}</span>
                          {question.penalty_points > 0 && (
                            <span className="text-red-600">-{question.penalty_points}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {onDuplicateQuestion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDuplicateQuestion(question)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {onEditQuestion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditQuestion(question)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteQuestion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteQuestion(question.id)}
                            className="h-7 w-7 p-0 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune question pour cette manche
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la manche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La manche "{round.title}" et toutes ses questions ({questions.length}) seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(round.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
