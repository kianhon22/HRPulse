import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserData } from '../hooks/getUserData';

interface HomeHeaderProps {
  userName?: string;
  userPoints?: number;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ userName, userPoints }) => {
  const { userData, loading } = getUserData();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      // Format: Sun, Apr 13
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      setCurrentDate(now.toLocaleDateString('en-US', dateOptions));

      // Format: 11:08 PM
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentTime(now.toLocaleTimeString('en-US', timeOptions));

      // Greeting
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
    const intervalId = setInterval(updateDateTime, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const displayName = userName || userData?.name || userData?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.rowContainer}>

        <View style={styles.leftContainer}>
          <View style={styles.userInfoContainer}>
            <View style={styles.avatarContainer}>
              {userData?.image_url ? (
                <Image source={{ uri: userData.image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#6A1B9A" />
                </View>
              )}
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightContainer}>
          <Text style={styles.dateText}>{currentDate}</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flex: 1,
    marginLeft: 10,
  },
  rightContainer: {
    alignItems: 'flex-end',
    marginRight: 50,
  },
  dateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  timeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
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