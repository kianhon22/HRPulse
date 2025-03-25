import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import * as Location from 'expo-location';
import React from 'react';

export default function AttendanceScreen() {
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCurrentAttendance();
  }, []);

  async function checkCurrentAttendance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentAttendance(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleCheckInOut() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for attendance');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      if (!currentAttendance || currentAttendance.check_out) {
        // Check in
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            user_id: user.id,
            check_in: new Date().toISOString(),
            location: locationData,
          });

        if (error) throw error;
      } else {
        // Check out
        const checkOutTime = new Date();
        const checkInTime = new Date(currentAttendance.check_in);
        const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        const { error } = await supabase
          .from('attendance_records')
          .update({
            check_out: checkOutTime.toISOString(),
            total_hours: totalHours,
          })
          .eq('id', currentAttendance.id);

        if (error) throw error;
      }

      await checkCurrentAttendance();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString();
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Today's Attendance</Text>
        
        {currentAttendance && (
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Check-in time:</Text>
            <Text style={styles.value}>{formatTime(currentAttendance.check_in)}</Text>
            
            {currentAttendance.check_out && (
              <>
                <Text style={styles.label}>Check-out time:</Text>
                <Text style={styles.value}>{formatTime(currentAttendance.check_out)}</Text>
                <Text style={styles.label}>Total hours:</Text>
                <Text style={styles.value}>
                  {currentAttendance.total_hours.toFixed(2)} hours
                </Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCheckInOut}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 
              (!currentAttendance || currentAttendance.check_out) ? 'Check In' : 'Check Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 