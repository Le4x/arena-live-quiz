import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    // Create client with user's auth token for verification
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin', { 
      check_user_id: user.id 
    });
    
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const { questionId, correctAnswer, sessionId } = await req.json();
    
    if (!questionId || !correctAnswer || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Récupérer toutes les réponses pour cette question
    const { data: answers, error: answersError } = await supabase
      .from('team_answers')
      .select('*, teams(name, score)')
      .eq('question_id', questionId)
      .eq('game_session_id', sessionId);

    if (answersError) throw answersError;
    if (!answers || answers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No answers to check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier chaque réponse via IA
    const checkResults = [];
    
    for (const answer of answers) {
      const prompt = `Tu es un correcteur de quiz. Vérifie si la réponse fournie est correcte en tenant compte des fautes d'orthographe légères.

Réponse attendue : "${correctAnswer}"
Réponse de l'équipe : "${answer.answer}"

Réponds UNIQUEMENT par "CORRECT" ou "INCORRECT" suivi d'un pourcentage de confiance (0-100).
Format : CORRECT 95 ou INCORRECT 30

Règles :
- Tolère les fautes d'orthographe mineures (1-2 lettres)
- Tolère les accents manquants ou en trop
- Tolère les espaces en trop/moins
- Si le sens est le même, c'est correct
- Si c'est une approximation proche, donne un pourcentage élevé même pour INCORRECT`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI check failed:", await aiResponse.text());
        checkResults.push({ answerId: answer.id, isCorrect: null, confidence: 0 });
        continue;
      }

      const aiData = await aiResponse.json();
      const result = aiData.choices[0].message.content.trim();
      const isCorrect = result.startsWith("CORRECT");
      const confidenceMatch = result.match(/\d+/);
      const confidence = confidenceMatch ? parseInt(confidenceMatch[0]) : 50;

      checkResults.push({ 
        answerId: answer.id, 
        teamId: answer.team_id,
        isCorrect, 
        confidence,
        teamName: answer.teams?.name,
        currentScore: answer.teams?.score || 0
      });
    }

    // Mettre à jour les réponses dans la base de données
    for (const result of checkResults) {
      if (result.isCorrect !== null) {
        await supabase
          .from('team_answers')
          .update({ 
            is_correct: result.isCorrect,
            points_awarded: result.isCorrect ? 10 : 0
          })
          .eq('id', result.answerId);

        // Mettre à jour le score de l'équipe
        if (result.isCorrect) {
          await supabase
            .from('teams')
            .update({ score: result.currentScore + 10 })
            .eq('id', result.teamId);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: checkResults 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
