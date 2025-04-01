// hrpulse/app/components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HeaderProps {
  userName: string;
  currentTime: string;
}

const Header: React.FC<HeaderProps> = ({ userName, currentTime }) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.greeting}>Welcome back, {userName}</Text>
      <Text style={styles.time}>{currentTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#6A1B9A', // Purple color
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  greeting: {
    color: 'white',
    fontSize: 18,
  },
  time: {
    color: 'white',
    fontSize: 14,
  },
});

export default Header;