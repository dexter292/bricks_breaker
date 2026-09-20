import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { createAsyncStoragePersonalBestStore } from '../../src/services/storage';
import { PlayingHost } from './PlayingHost';
import { TitleScreen } from './TitleScreen';

type ShellPhase = 'title' | 'playing';

/**
 * App shell: Title ↔ Playing (D-01, D-02, D-05).
 * Shell only — PlayingHost mounts while playing so Menu unmount
 * tears down the game loop worklets (RESEARCH Pattern 1 / Pitfall 1).
 */
export function GameHost() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [shellPhase, setShellPhase] = useState<ShellPhase>('title');
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (shellPhase !== 'title') return;
    void createAsyncStoragePersonalBestStore()
      .getBest()
      .then(setBest)
      .catch(() => setBest(0));
  }, [shellPhase]);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  if (shellPhase === 'title') {
    return (
      <TitleScreen best={best} onPlay={() => setShellPhase('playing')} />
    );
  }

  return <PlayingHost onMenu={() => setShellPhase('title')} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
