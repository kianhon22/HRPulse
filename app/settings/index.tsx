import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const settingsOptions = [
    { title: 'Privacy', icon: 'lock-closed-outline' },
    { title: 'Help & Support', icon: 'help-circle-outline' },
    { title: 'About', icon: 'information-circle-outline' },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingsOptions.map((option, index) => (
        <TouchableOpacity key={option.title} style={styles.optionButton}>
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