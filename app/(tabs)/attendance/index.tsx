import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase } from '../../../supabase';
import { formatTotalHours } from '../../../utils/formatText';
import { useSupabaseRealtime } from '../../../hooks/useSupabaseRealtime';
import RefreshWrapper from '../../../components/RefreshWrapper';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    startingDay?: boolean;
    endingDay?: boolean;
    color?: string;
    textColor?: string;
  };
}

export default function AttendancePage() {
  // Get default date range (last 2 weeks)
  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);
  
  const [startDate, setStartDate] = useState<string | null>(twoWeeksAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string | null>(today.toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Memoize updateMarkedDates to avoid re-creation
  const updateMarkedDates = useCallback((records: AttendanceRecord[]) => {
    const marks: MarkedDates = {};
    
    // Mark the date range if selected
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        marks[dateStr] = {
          color: '#E8F5E9',
          textColor: '#000000',
        };
      }
      
      // Add special marking for start and end dates
      marks[startDate] = {
        ...marks[startDate],
        startingDay: true,
        color: '#6A1B9A',
        textColor: '#FFFFFF'
      };
      marks[endDate] = {
        ...marks[endDate],
        endingDay: true,
        color: '#6A1B9A',
        textColor: '#FFFFFF'
      };
    }

    // Mark dates with attendance records
    records.forEach(record => {
      const date = new Date(record.check_in).toISOString().split('T')[0];
      if (marks[date]) {
        marks[date] = {
          ...marks[date],
          marked: true,
          dotColor: '#4CAF50'
        };
      } else {
        marks[date] = {
          marked: true,
          dotColor: '#4CAF50'
        };
      }
    });

    setMarkedDates(marks);
  }, [startDate, endDate]);

  // Memoize loadAttendanceRecords to prevent unnecessary re-creation
  const loadAttendanceRecords = useCallback(async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from('attendances')
        .select('*')
        .eq('user_id', userId)
        .order('check_in', { ascending: false });

      // Apply date range filter if both dates are selected
      if (startDate && endDate) {
        query = query
          .gte('check_in', `${startDate}T00:00:00`)
          .lte('check_in', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAttendanceRecords(data || []);
      updateMarkedDates(data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }, [userId, startDate, endDate, updateMarkedDates]);

  // Create a stable callback for realtime updates
  const handleAttendanceChange = useCallback(() => {
    loadAttendanceRecords();
  }, [loadAttendanceRecords]);

  // Set up realtime subscription
  useSupabaseRealtime(
    'attendances',
    '*',
    'user_id',
    userId || undefined,
    handleAttendanceChange
  );

  // Load initial data when dependencies change
  useEffect(() => {
    if (userId) {
      loadAttendanceRecords();
    }
  }, [userId, loadAttendanceRecords]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await loadAttendanceRecords();
  }, [loadAttendanceRecords]);

  // Handle day selection in calendar
  const handleDayPress = useCallback((day: DateData) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(day.dateString);
      setEndDate(null);
    } else {
      // Complete the selection
      if (new Date(day.dateString) >= new Date(startDate)) {
        setEndDate(day.dateString);
      } else {
        setEndDate(startDate);
        setStartDate(day.dateString);
      }
    }
  }, [startDate, endDate]);

  // Format time utilities
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType="period"
        theme={{
          selectedDayBackgroundColor: '#6A1B9A',
          todayTextColor: '#6A1B9A',
          arrowColor: '#6A1B9A',
        }}
      />

      <RefreshWrapper 
        onRefresh={handleRefresh}
        style={styles.recordsList}
      >
        <View>
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
                    {formatTotalHours(record.total_hours ?? 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </RefreshWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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