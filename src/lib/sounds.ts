// Helper functions for playing game sounds

export const playSound = (soundType: 'buzz' | 'correct' | 'incorrect' | 'eliminate') => {
  const sounds = localStorage.getItem('arena_sounds');
  if (!sounds) return;

  try {
    const soundList = JSON.parse(sounds);
    const sound = soundList.find((s: any) => 
      s.name.toLowerCase().includes(soundType)
    );

    if (sound?.url) {
      const audio = new Audio(sound.url);
      audio.play().catch(err => console.log('Could not play sound:', err));
    }
  } catch (err) {
    console.log('Error playing sound:', err);
  }
};
