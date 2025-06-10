import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const settingsOptions = [
    { 
      title: 'Privacy', 
      icon: 'lock-closed-outline', 
      onPress: () => router.push('./settings/privacy' as any)
    },
    { 
      title: 'Help & Support', 
      icon: 'help-circle-outline', 
      onPress: () => router.push('./settings/help' as any)
    },
    { 
      title: 'About', 
      icon: 'information-circle-outline', 
      onPress: () => router.push('./settings/about' as any)
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingsOptions.map((option, index) => (
        <TouchableOpacity 
          key={option.title} 
          style={styles.optionButton}
          onPress={option.onPress}
        >
          <View style={styles.optionContent}>
            <Ionicons name={option.icon as any} size={24} color="#666" />
            <Text style={styles.optionText}>{option.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
}); 