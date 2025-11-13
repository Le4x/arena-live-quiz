-- Migration automatique pour nettoyer les finales actives et orphelines
-- Exécuté automatiquement au prochain redémarrage de Supabase

-- 1. Désactiver le mode final dans tous les game_states
UPDATE public.game_state
SET
  final_mode = false,
  final_id = null
WHERE final_mode = true;

-- 2. Marquer toutes les finales non-completed comme completed
UPDATE public.finals
SET
  status = 'completed',
  completed_at = COALESCE(completed_at, now())
WHERE status != 'completed';

-- 3. Supprimer tous les jokers pour éviter les orphelins
-- (Ils seront recréés lors de la prochaine finale)
DELETE FROM public.final_jokers;

-- Log de nettoyage
DO $$
BEGIN
  RAISE NOTICE 'Migration cleanup_active_finals exécutée avec succès';
  RAISE NOTICE 'Toutes les finales ont été désactivées';
  RAISE NOTICE 'Tous les jokers ont été supprimés';
END $$;
