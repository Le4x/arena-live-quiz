/**
 * GameControlPanel - Panneau de contrôle principal du jeu
 * Gestion des questions, timer, écrans, réponses
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  EyeOff,
  Clock,
  Monitor,
  Settings,
} from 'lucide-react';
import { QuestionSelector } from './QuestionSelector';
import { TimerControl } from './TimerControl';
import { ScreenControl } from './ScreenControl';
import { AnswersMonitor } from './AnswersMonitor';

interface GameControlPanelProps {
  sessionId: string;
  currentSession: any;
  gameState: any;
  rounds: any[];
  questions: any[];
  teams: any[];
  currentQuestion: any;
  currentRound: any;
  onLoadData: () => void;
}

export const GameControlPanel = ({
  sessionId,
  currentSession,
  gameState,
  rounds,
  questions,
  teams,
  currentQuestion,
  currentRound,
  onLoadData,
}: GameControlPanelProps) => {
  const [activeTab, setActiveTab] = useState('question');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-arena bg-clip-text text-transparent">
            Contrôle du Jeu
          </h2>
          <p className="text-muted-foreground mt-1">
            {currentRound ? (
              <>Manche: {currentRound.title}</>
            ) : (
              'Sélectionnez une manche pour commencer'
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-2">
          {currentQuestion && (
            <Badge className="text-lg px-4 py-2">
              Question {currentQuestion.order_index + 1} / {questions.length}
            </Badge>
          )}
          {gameState?.timer_active && (
            <Badge variant="destructive" className="text-lg px-4 py-2 animate-pulse">
              <Clock className="w-4 h-4 mr-2" />
              Timer actif
            </Badge>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="question" className="gap-2">
            <Play className="w-4 h-4" />
            Question
          </TabsTrigger>
          <TabsTrigger value="timer" className="gap-2">
            <Clock className="w-4 h-4" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="screens" className="gap-2">
            <Monitor className="w-4 h-4" />
            Écrans
          </TabsTrigger>
          <TabsTrigger value="answers" className="gap-2">
            <Eye className="w-4 h-4" />
            Réponses
          </TabsTrigger>
        </TabsList>

        {/* Question Selection & Control */}
        <TabsContent value="question" className="mt-6">
          <QuestionSelector
            sessionId={sessionId}
            rounds={rounds}
            questions={questions}
            currentQuestion={currentQuestion}
            currentRound={currentRound}
            gameState={gameState}
            onLoadData={onLoadData}
          />
        </TabsContent>

        {/* Timer Control */}
        <TabsContent value="timer" className="mt-6">
          <TimerControl
            sessionId={sessionId}
            gameState={gameState}
            currentQuestion={currentQuestion}
            onLoadData={onLoadData}
          />
        </TabsContent>

        {/* Screen Control */}
        <TabsContent value="screens" className="mt-6">
          <ScreenControl
            sessionId={sessionId}
            gameState={gameState}
            currentSession={currentSession}
            onLoadData={onLoadData}
          />
        </TabsContent>

        {/* Answers Monitor */}
        <TabsContent value="answers" className="mt-6">
          <AnswersMonitor
            sessionId={sessionId}
            currentQuestion={currentQuestion}
            teams={teams}
            gameState={gameState}
            onLoadData={onLoadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
