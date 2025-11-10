-- ============================================================================
-- SUPPRIMER LA FINALE QUI SE RÉACTIVE AUTOMATIQUEMENT
-- ============================================================================

-- 1. D'abord, voir quelle finale est active pour cette session
SELECT
  id,
  game_session_id,
  status,
  mode,
  created_at,
  started_at,
  completed_at
FROM public.finals
WHERE status NOT IN ('cancelled', 'completed')
ORDER BY created_at DESC;

-- 2. OPTION A: Marquer la finale comme "cancelled" (recommandé)
-- Remplace 'TON_GAME_SESSION_ID' par l'ID de ta session actuelle

UPDATE public.finals
SET
  status = 'cancelled',
  completed_at = now()
WHERE game_session_id = 'TON_GAME_SESSION_ID'
  AND status NOT IN ('cancelled', 'completed');

-- 3. OPTION B: Supprimer COMPLÈTEMENT toutes les finales actives
-- ⚠️ ATTENTION: Cela supprime définitivement les finales !

DELETE FROM public.finals
WHERE game_session_id = 'TON_GAME_SESSION_ID'
  AND status NOT IN ('cancelled', 'completed');

-- 4. Vérification: Plus de finales actives
SELECT
  COUNT(*) as finales_actives
FROM public.finals
WHERE game_session_id = 'TON_GAME_SESSION_ID'
  AND status NOT IN ('cancelled', 'completed');

-- Devrait retourner 0

-- ============================================================================
-- BONUS: Nettoyer TOUTES les finales de TOUTES les sessions (DANGER!)
-- ============================================================================
-- ⚠️ NE LANCE CECI QUE SI TU VEUX TOUT SUPPRIMER

-- UPDATE public.finals SET status = 'cancelled', completed_at = now();
-- DELETE FROM public.finals;
