// hrpulse/app/components/HomeHeader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserData } from '../hooks/getUserData';

const HomeHeader: React.FC = () => {
  const { userData, loading } = getUserData();
  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Update time initially and every minute
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      setCurrentTime(now.toLocaleString('en-US', options));

      // Set greeting based on time of day
      const hours = now.getHours();
      if (hours >= 2 && hours < 12) {
        setGreeting('Good morning');
      } else if (hours >= 12 && hours < 17) {
        setGreeting('Good afternoon');
      } else if (hours >= 17 && hours < 20) {
        setGreeting('Good evening');
      } else {
        setGreeting('Good night');
      }
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  const displayName = userData?.name || userData?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.timeText}>{currentTime}</Text>
      
      <View style={styles.userInfoContainer}>
        <View style={styles.avatarContainer}>
          {userData?.image_url ? (
            <Image 
              source={{ uri: userData.image_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#6A1B9A" />
            </View>
          )}
        </View>
        
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>
            {greeting},
          </Text>
          <Text style={styles.userName}>
            {displayName}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#6A1B9A',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  timeText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default HomeHeader;