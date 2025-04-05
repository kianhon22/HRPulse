import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  location: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
}

interface UserProfile {
  id: string;
  work_mode: string;
}

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    selected: boolean;
  };
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUserProfile();
    loadAttendanceRecords();
  }, []);

  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('id, work_mode')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async function loadAttendanceRecords() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .order('check_in', { ascending: false });

      if (error) throw error;

      setAttendanceRecords(data || []);
      
      // Mark dates on calendar
      const marks: MarkedDates = {};
      data?.forEach(record => {
        const date = new Date(record.check_in).toISOString().split('T')[0];
        marks[date] = {
          marked: true,
          dotColor: '#007AFF',
          selected: date === selectedDate
        };
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading attendance:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      let locationData = null;

      // Only get location for remote employees
      if (userProfile?.work_mode === 'remote') {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for remote attendance');
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({});
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      const { data, error } = await supabase
        .from('attendances')
        .insert([
          {
            user_id: user.id,
            check_in: new Date().toISOString(),
            location: locationData
          }
        ]);

      if (error) throw error;
      Alert.alert('Success', 'Checked in successfully');
      loadAttendanceRecords();
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    }
  }

  async function handleCheckOut() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Find today's record
      const todayRecord = attendanceRecords.find(record => 
        new Date(record.check_in).toISOString().split('T')[0] === today && !record.check_out
      );

      if (!todayRecord) {
        Alert.alert('Error', 'No active check-in found for today');
        return;
      }

      // Calculate total hours
      const checkInTime = new Date(todayRecord.check_in);
      const totalHours = ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      const { error } = await supabase
        .from('attendances')
        .update({
          check_out: now.toISOString(),
          total_hours: parseFloat(totalHours.toFixed(2))
        })
        .eq('id', todayRecord.id);

      if (error) throw error;
      Alert.alert('Success', 'Checked out successfully');
      loadAttendanceRecords();
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out');
    }
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#6A1B9A',
          todayTextColor: '#6A1B9A',
          arrowColor: '#6A1B9A',
        }}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.checkButton,
            loading && styles.buttonDisabled
          ]} 
          onPress={handleCheckIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.checkButton,
            loading && styles.buttonDisabled
          ]} 
          onPress={handleCheckOut}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.recordsList}>
        {attendanceRecords.map((record) => (
          <View key={record.id} style={styles.recordItem}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {new Date(record.check_in).getDate()}
              </Text>
              <Text style={styles.dayText}>
                {new Date(record.check_in).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Check In</Text>
                <Text style={styles.timeValue}>{formatTime(record.check_in)}</Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Check Out</Text>
                <Text style={styles.timeValue}>
                  {record.check_out ? formatTime(record.check_out) : '--:--'}
                </Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Total Hours</Text>
                <Text style={styles.timeValue}>
                  {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
  },
  checkButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#B39DDB',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recordsList: {
    flex: 1,
    padding: 15,
  },
  recordItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  dateContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    width: 60,
  },
  dateText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayText: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
  timeContainer: {
    flex: 1,
  },
  timeBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  timeLabel: {
    color: '#666',
    fontSize: 14,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 