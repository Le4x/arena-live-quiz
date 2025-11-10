/**
 * DashboardPanel - Tableau de bord de la régie
 * Vue d'ensemble et statistiques en temps réel
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Users,
  Trophy,
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Eye,
} from 'lucide-react';
import { BuzzerMonitor } from '@/components/BuzzerMonitor';
import { QCMAnswersDisplay } from '@/components/QCMAnswersDisplay';
import { TextAnswersDisplay } from '@/components/TextAnswersDisplay';
import { HelpRequestMonitor } from '@/components/HelpRequestMonitor';

interface DashboardPanelProps {
  teams: any[];
  currentQuestion: any;
  gameState: any;
  buzzers: any[];
  sessionId: string;
}

export const DashboardPanel = ({
  teams,
  currentQuestion,
  gameState,
  buzzers,
  sessionId,
}: DashboardPanelProps) => {
  const [qcmAnswers, setQcmAnswers] = useState<any[]>([]);
  const [textAnswers, setTextAnswers] = useState<any[]>([]);

  // Stats calculées
  const connectedTeams = teams.filter((t) => t.is_active);
  const totalPoints = teams.reduce((sum, t) => sum + (t.score || 0), 0);
  const averageScore = teams.length > 0 ? totalPoints / teams.length : 0;
  const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];

  const stats = [
    {
      label: 'Équipes connectées',
      value: connectedTeams.length,
      total: teams.length,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Points total',
      value: totalPoints,
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Moyenne',
      value: averageScore.toFixed(0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Buzzers actifs',
      value: buzzers.length,
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
          Tableau de Bord
        </h2>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble en temps réel de votre quiz
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black">
                      {stat.value}
                      {stat.total && (
                        <span className="text-lg text-muted-foreground">/{stat.total}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Leader & Current Question */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Team */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold">Équipe en tête</h3>
          </div>
          {topTeam ? (
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full"
                style={{ backgroundColor: topTeam.color }}
              />
              <div className="flex-1">
                <h4 className="text-xl font-black">{topTeam.name}</h4>
                <p className="text-2xl font-black text-primary">{topTeam.score} pts</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune équipe</p>
          )}
        </Card>

        {/* Current Question */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Question actuelle</h3>
          </div>
          {currentQuestion ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge>{currentQuestion.question_type}</Badge>
                <Badge variant="secondary">{currentQuestion.points} pts</Badge>
              </div>
              <p className="text-sm line-clamp-2">{currentQuestion.question_text}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune question active</p>
          )}
        </Card>
      </div>

      {/* Monitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buzzers */}
        {currentQuestion?.question_type === 'buzzer' && buzzers.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold">Buzzers ({buzzers.length})</h3>
            </div>
            <BuzzerMonitor
              teams={teams}
              buzzers={buzzers}
              currentQuestionId={currentQuestion.id}
            />
          </Card>
        )}

        {/* QCM Answers */}
        {currentQuestion?.question_type === 'qcm' && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-bold">Réponses QCM</h3>
            </div>
            <QCMAnswersDisplay
              teams={teams}
              answers={qcmAnswers}
              currentQuestionId={currentQuestion.id}
              questionOptions={currentQuestion.options}
              correctAnswer={currentQuestion.correct_answer}
            />
          </Card>
        )}

        {/* Text Answers */}
        {currentQuestion?.question_type === 'free_text' && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold">Réponses libres</h3>
            </div>
            <TextAnswersDisplay
              teams={teams}
              answers={textAnswers}
              currentQuestionId={currentQuestion.id}
            />
          </Card>
        )}

        {/* Help Requests */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold">Demandes d'aide</h3>
          </div>
          <HelpRequestMonitor sessionId={sessionId} />
        </Card>
      </div>
    </div>
  );
};
