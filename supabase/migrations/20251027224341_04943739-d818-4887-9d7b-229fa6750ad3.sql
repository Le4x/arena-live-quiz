-- Ajouter un champ pour gérer l'affichage de l'écran d'ambiance
ALTER TABLE game_state ADD COLUMN show_ambient_screen BOOLEAN DEFAULT true;