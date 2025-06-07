import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const tabs = [
  { name: 'leave', title: 'Leave', icon: 'calendar' },
  { name: 'survey', title: 'Survey', icon: 'list-alt' },
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'recognition', title: 'Recognition', icon: 'trophy' },
  { name: 'rewards', title: 'Rewards', icon: 'gift' },
];

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabPress = (tabName: string) => {
    router.push(tabName === 'index' ? '/(tabs)' : `/(tabs)/${tabName}` as any);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === `/(tabs)/${tab.name}` || 
                        (pathname === '/(tabs)' && tab.name === 'index');
        
        return (
          <Pressable
            key={tab.name}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed
            ]}
            onPress={() => handleTabPress(tab.name)}
            android_ripple={{ color: '#6A1B9A20', borderless: false }}
          >
            <FontAwesome
              name={tab.icon as any}
              size={28}
              style={styles.icon}
              color={isActive ? '#6A1B9A' : '#999'}
            />
            <Text
              style={[
                styles.tabText,
                { color: isActive ? '#6A1B9A' : '#999' }
              ]}
            >
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: 50,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPressed: {
    backgroundColor: '#6A1B9A10',
  },
  icon: {
    marginTop: 3,
    fontWeight: '600',
  },
  tabText: {
    marginTop: -2,
    fontSize: 10,
    fontWeight: '600',
  },
}); 