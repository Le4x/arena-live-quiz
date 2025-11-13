-- ============================================
-- NETTOYAGE COMPLET ET RÉINITIALISATION
-- ============================================
-- Ce script supprime TOUT et recommence de zéro
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🧹 NETTOYAGE COMPLET EN COURS...';
  RAISE NOTICE '═══════════════════════════════════════';

  -- 1. Supprimer toutes les données
  DELETE FROM final_jokers;
  RAISE NOTICE '✅ Jokers de finales supprimés';

  DELETE FROM finals;
  RAISE NOTICE '✅ Finales supprimées';

  DELETE FROM joker_types;
  RAISE NOTICE '✅ Types de jokers supprimés';

  -- 2. Supprimer les tables
  DROP TABLE IF EXISTS final_jokers CASCADE;
  DROP TABLE IF EXISTS finals CASCADE;
  DROP TABLE IF EXISTS joker_types CASCADE;
  RAISE NOTICE '✅ Tables supprimées';

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prêt pour une installation propre';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
