// hrpulse/app/home.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../supabase';
import HomeHeader from '../../components/HomeHeader';
import * as Location from 'expo-location';
import { getUserData, UserData } from '../../hooks/getUserData';

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
}

function calculateServiceYears(joinDate?: string, leftDate?: string | null): number {
  if (!joinDate) return 0;

  const start = new Date(joinDate);
  const end = leftDate ? new Date(leftDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
}

function calculateAnnualLeaves(serviceYears: number): number {
  if (serviceYears < 2) return 8;
  if (serviceYears >= 2 && serviceYears <= 5) return 12;
  return 16;
}

async function calculateRemainingLeaves(userId: string, joinDate?: string, leftDate?: string | null): Promise<number> {
  if (!joinDate) return 0;
  
  const serviceYears = calculateServiceYears(joinDate, leftDate);
  const annualLeaves = calculateAnnualLeaves(serviceYears);
  
  // Get approved leaves for current year
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  try {
    const { data: leavesData, error } = await supabase
      .from('leaves')
      .select('total_days')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);

    if (error) throw error;

    const usedLeaves = leavesData?.reduce((total, leave) => total + (leave.total_days || 0), 0) || 0;
    return annualLeaves - usedLeaves;
  } catch (error) {
    console.error('Error calculating remaining leaves:', error);
    return annualLeaves;
  }
}

export default function Home() {
  const { userData, loading: userLoading } = getUserData();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingLeaves, setRemainingLeaves] = useState<number>(0);

  const refreshLeaves = async () => {
    if (userData?.id && userData?.join_company_date) {
      const leaves = await calculateRemainingLeaves(
        userData.id,
        userData.join_company_date,
        userData.left_company_date
      );
      setRemainingLeaves(leaves);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
    refreshLeaves();
  }, [userData]);

  async function loadTodayAttendance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', today)
        .lte('check_in', today + 'T23:59:59')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayRecord(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }

  function isWithinWorkHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 7 && hour <= 22;
  }

  async function handleCheckIn() {
    if (!isWithinWorkHours()) {
      Alert.alert('Outside Work Hours', 'Check-in is only available between 7 AM and 10 PM');
      return;
    }

    try {
      setLoading(true);
      let locationData = null;
      if (userData?.work_mode === 'remote') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for remote attendance');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      const { error } = await supabase
        .from('attendances')
        .insert([{
          user_id: userData?.id,
          check_in: new Date().toISOString(),
          location: locationData
        }]);

      if (error) throw error;
      loadTodayAttendance();
      Alert.alert('Success', 'Checked in successfully');
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!isWithinWorkHours()) {
      Alert.alert('Outside Work Hours', 'Check-out is only available between 7 AM and 10 PM');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const checkInTime = new Date(todayRecord!.check_in);
      const totalHours = ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      const { error } = await supabase
        .from('attendances')
        .update({
          check_out: now.toISOString(),
          total_hours: parseFloat(totalHours.toFixed(2))
        })
        .eq('id', todayRecord!.id);

      if (error) throw error;
      loadTodayAttendance();
      Alert.alert('Success', 'Checked out successfully');
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out');
    } finally {
      setLoading(false);
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <HomeHeader />

          <View style={styles.content}>
            <View style={[styles.card, styles.checkCard]}>
              <Text style={styles.cardTitle}>
                {!todayRecord ? 'Check In' : 
                  !todayRecord.check_out ? 'Check Out' : 'Today\'s Record'}
              </Text>
              {todayRecord ? (
                <>
                  <Text style={styles.timeText}>
                    In: {formatTime(todayRecord.check_in)}
                  </Text>
                  {todayRecord.check_out && (
                    <>
                      <Text style={styles.timeText}>
                        Out: {formatTime(todayRecord.check_out)}
                      </Text>
                      <Text style={styles.hoursText}>
                        Total: {todayRecord.total_hours?.toFixed(2)}h
                      </Text>
                    </>
                  )}
                </>
              ) : (
                <Text style={styles.cardSubtitle}>Tap to start your day</Text>
              )}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  loading && styles.buttonDisabled,
                  todayRecord?.check_out && styles.buttonCompleted
                ]}
                onPress={!todayRecord ? handleCheckIn : 
                  !todayRecord.check_out ? handleCheckOut : undefined}
                disabled={loading || !!todayRecord?.check_out}
              >
                <Text style={styles.buttonText}>
                  {!todayRecord ? 'CHECK IN' : 
                    !todayRecord.check_out ? 'CHECK OUT' : 'COMPLETED'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Points</Text>
              <Text style={styles.cardValue}>{userData?.points || 0}</Text>
              <Text style={styles.cardSubtitle}>to be redeemed</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Annual Leave</Text>
              <Text style={styles.cardValue}>{remainingLeaves}</Text>
              <Text style={styles.cardSubtitle}>remaining days</Text>
              <Text style={styles.serviceYears}>
                {calculateServiceYears(userData?.join_company_date || '', userData?.left_company_date)} years of service
              </Text>
            </View>

            {/* Analytics Section */}
            <View style={styles.analytics}>
              <Text style={styles.analyticsTitle}>Analytics</Text>
              {/* Placeholder for chart */}
              <View style={styles.chartPlaceholder}>
                <Text>Worktime Chart</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6A1B9A', // Purple color
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  analytics: {
    marginTop: 20,
    marginBottom: 20,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  checkCard: {
    backgroundColor: '#6A1B9A',
    padding: 25,
  },
  timeText: {
    fontSize: 18,
    color: 'white',
    marginVertical: 4,
  },
  hoursText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
    alignSelf: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B39DDB',
  },
  buttonCompleted: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceYears: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});