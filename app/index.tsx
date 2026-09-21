import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { GameHost } from './_components/GameHost';

export default function Index() {
  return (
    <GestureHandlerRootView style={styles.fills}>
      <SafeAreaProvider style={styles.fills}>
        <GameHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fills: { flex: 1 },
});
