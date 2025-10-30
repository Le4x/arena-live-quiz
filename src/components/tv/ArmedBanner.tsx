/**
 * ArmedBanner - Bannière "ÉCLAIR ⚡" quand les buzzers sont activés
 * Affichée en haut de l'écran TV pour signaler que les équipes peuvent buzzer
 */

export const ArmedBanner = ({ armed }: { armed: boolean }) => {
  if (!armed) return null;

  return (
    <div className="fixed top-6 inset-x-0 mx-auto w-fit px-8 py-4 rounded-2xl bg-yellow-500/95 text-black shadow-2xl animate-pulse z-50">
      <div className="text-3xl font-black tracking-wider flex items-center gap-3">
        <span className="text-4xl">⚡</span>
        ÉCLAIR - Buzzers activés
        <span className="text-4xl">⚡</span>
      </div>
    </div>
  );
};
