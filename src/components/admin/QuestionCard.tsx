import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Copy, Music, TrendingUp, TrendingDown } from "lucide-react";
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

interface QuestionCardProps {
  question: any;
  roundTitle: string;
  onEdit: (question: any) => void;
  onDelete: (questionId: string) => void;
  onDuplicate: (question: any) => void;
}

export const QuestionCard = ({ question, roundTitle, onEdit, onDelete, onDuplicate }: QuestionCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      <Card className="p-4 bg-muted/50 hover:bg-muted/70 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(question.question_type)}
              </Badge>
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                <TrendingUp className="h-3 w-3" />
                +{question.points}
              </Badge>
              {question.penalty_points > 0 && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -{question.penalty_points}
                </Badge>
              )}
              {question.audio_url && (
                <Badge variant="outline" className="text-xs bg-secondary/10 gap-1">
                  <Music className="h-3 w-3" />
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold mb-1 line-clamp-2">{question.question_text}</h4>
            
            <p className="text-xs text-muted-foreground">
              Manche : {roundTitle}
            </p>
            
            {question.correct_answer && (
              <p className="text-xs text-muted-foreground mt-1">
                Réponse : <span className="font-medium">{question.correct_answer}</span>
              </p>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(question)}
              title="Dupliquer"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(question)}
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
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la question ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La question sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(question.id)}
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
