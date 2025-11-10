import { motion } from "framer-motion";
import { Clock, Zap, Music, FileText, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NextQuestionPreviewProps {
  questionText?: string;
  questionType?: 'qcm' | 'blind_test' | 'free_text';
  points?: number;
  countdown?: number; // Secondes avant la prochaine question
}

export const NextQuestionPreview = ({
  questionText,
  questionType,
  points = 10,
  countdown
}: NextQuestionPreviewProps) => {
  if (!questionText) return null;

  const getTypeConfig = () => {
    switch (questionType) {
      case 'qcm':
        return {
          icon: <HelpCircle className="w-6 h-6" />,
          label: 'QCM',
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30'
        };
      case 'blind_test':
        return {
          icon: <Music className="w-6 h-6" />,
          label: 'Blind Test',
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/30'
        };
      case 'free_text':
        return {
          icon: <FileText className="w-6 h-6" />,
          label: 'Texte Libre',
          color: 'text-orange-500',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30'
        };
      default:
        return {
          icon: <Zap className="w-6 h-6" />,
          label: 'Question',
          color: 'text-primary',
          bg: 'bg-primary/10',
          border: 'border-primary/30'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
      className="w-full px-8 pb-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Séparateur animé */}
        <motion.div
          className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mb-4"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
        />

        <div className={`
          relative overflow-hidden rounded-2xl border-2 ${config.border}
          bg-card/40 backdrop-blur-lg
          p-6 transition-all duration-300
          hover:scale-[1.01] hover:shadow-xl
        `}>
          {/* Glow d'arrière-plan subtil */}
          <div className={`absolute inset-0 ${config.bg} opacity-50`} />

          <div className="relative flex items-center gap-6">
            {/* Icône du type de question */}
            <div className={`
              flex-shrink-0 w-16 h-16 rounded-xl
              ${config.bg} ${config.border} border-2
              flex items-center justify-center ${config.color}
            `}>
              {config.icon}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              {/* Header avec label et countdown */}
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`${config.bg} ${config.color} border ${config.border} text-sm font-bold px-3 py-1`}>
                  Prochaine Question
                </Badge>

                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 font-bold px-3 py-1">
                  +{points} pts
                </Badge>

                {countdown !== undefined && countdown > 0 && (
                  <motion.div
                    className="flex items-center gap-2 ml-auto"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-lg font-bold tabular-nums">
                      {countdown}s
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Texte de la question (tronqué) */}
              <p className="text-xl font-semibold text-foreground/80 line-clamp-2">
                {questionText}
              </p>
            </div>

            {/* Badge du type sur le côté droit */}
            <div className="flex-shrink-0">
              <Badge className={`${config.bg} ${config.color} text-base font-bold px-4 py-2`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
