-- Script de nettoyage pour les finales et jokers orphelins
-- À exécuter pour nettoyer les anciennes données problématiques

-- 1. Supprimer tous les jokers liés à des finales qui n'existent plus ou sont 'completed'
DELETE FROM public.final_jokers
WHERE final_id IN (
  SELECT id FROM public.finals WHERE status = 'completed'
);

-- 2. Réinitialiser le mode final dans game_state si une finale completed est référencée
UPDATE public.game_state
SET final_mode = false, final_id = null
WHERE final_id IN (
  SELECT id FROM public.finals WHERE status = 'completed'
);

-- 3. Optionnel : Supprimer complètement les anciennes finales terminées (si vous voulez un clean slate)
-- Décommenter la ligne suivante si vous voulez supprimer toutes les finales 'completed'
-- DELETE FROM public.finals WHERE status = 'completed';

-- Vérification : Afficher les finales restantes
SELECT
  f.id,
  f.status,
  f.started_at,
  COUNT(fj.id) as joker_count
FROM public.finals f
LEFT JOIN public.final_jokers fj ON fj.final_id = f.id
GROUP BY f.id, f.status, f.started_at
ORDER BY f.started_at DESC;
