import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ValidationIssue } from '../loadLevel';

type Props = {
  issues: ValidationIssue[];
};

/**
 * Actionable level validation failure overlay (D-13).
 * Mirrors ResultOverlay chrome — absolute scrim + SpaceMono panel.
 * No Retry/play controls: host must fix data or switch levels in __DEV__.
 */
export function LevelErrorOverlay({ issues }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.scrim,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      pointerEvents="auto"
    >
      <View style={styles.panel}>
        <Text style={styles.heading}>Level Error</Text>
        <Text style={styles.body}>Invalid level — gameplay blocked</Text>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {issues.map((issue, i) => (
            <Text key={`${issue.path}-${i}`} style={styles.issue}>
              {`${issue.path}: ${issue.message}`}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#12121f',
    padding: 24,
    minWidth: 240,
    maxWidth: 320,
    maxHeight: '80%',
    alignItems: 'stretch',
  },
  heading: {
    color: '#E85D5D',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    maxHeight: 240,
  },
  listContent: {
    gap: 8,
  },
  issue: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
});
