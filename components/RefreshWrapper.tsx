import React, { useState, ReactNode, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

interface RefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  style?: any;
  scrollEnabled?: boolean;
  contentContainerStyle?: any;
}

export default function RefreshWrapper({
  children,
  onRefresh,
  style,
  scrollEnabled = true,
  contentContainerStyle,
}: RefreshWrapperProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple refresh calls
    
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.contentContainer,
        !scrollEnabled && styles.scrollDisabled,
        contentContainerStyle,
      ]}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          colors={['#6A1B9A']} // Purple color matching the app theme
        />
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  scrollDisabled: {
    flex: 1,
  },
}); 