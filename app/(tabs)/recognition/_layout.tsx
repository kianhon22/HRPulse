import { Stack } from 'expo-router';
import Header from '../../../components/Header';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';

export default function RecognitionLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Set active tab based on the current path
    if (pathname.includes('personal')) {
      setActiveTab('personal');
    } else if (pathname.includes('form')) {
      // Don't change the active tab when on the form
    } else {
      setActiveTab('all');
    }
  }, [pathname]);

  const navigateTo = (tab: string) => {
    if (tab === 'all') {
      router.push('/recognition' as any);
    } else {
      router.push('/recognition/personal' as any);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Recognitions" />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all' && styles.activeTab]}
          onPress={() => navigateTo('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Recognitions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'personal' && styles.activeTab]}
          onPress={() => navigateTo('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
            My Recognitions
          </Text>
        </TouchableOpacity>
      </View>

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="index"
        />
        <Stack.Screen 
          name="personal"
        />
        <Stack.Screen 
          name="form"
          options={{
            presentation: 'modal',
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6A1B9A',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
  },
  activeTabText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
}); 