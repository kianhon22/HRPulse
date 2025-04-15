import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSupabaseRealtime } from '../../../hooks/useSupabaseRealtime';
import RefreshWrapper from '../../../components/RefreshWrapper';

interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  period: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

const LEAVE_TYPES = [
  'All',
  'Annual',
  'Medical',
  'Emergency',
  'Unpaid',
];

export default function LeaveHistoryPage() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Format date for display
  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Memoize the loadLeaveApplications function to prevent unnecessary re-creation
  const loadLeaveApplications = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;

      let query = supabase
        .from('leaves')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply date filter if dates are selected
      if (startDate) {
        const formattedStartDate = startDate.toISOString().split('T')[0];
        query = query.gte('start_date', formattedStartDate);
      } else {
        query = query.gte('start_date', yearStart);
      }

      if (endDate) {
        const formattedEndDate = endDate.toISOString().split('T')[0];
        query = query.lte('end_date', formattedEndDate);
      }

      // Apply leave type filter if selected
      if (selectedType && selectedType !== 'All') {
        query = query.eq('leave_type', selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading leave applications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedType, startDate, endDate]);

  // Clear filters
  const clearFilters = () => {
    setSelectedType('');
    setStartDate(null);
    setEndDate(null);
  };

  // Use a stable callback function for real-time updates
  const handleLeaveChange = useCallback(() => {
    loadLeaveApplications();
  }, [loadLeaveApplications]);

  // Set up real-time subscription
  useSupabaseRealtime(
    'leaves',
    '*',
    'user_id',
    userId || undefined,
    handleLeaveChange
  );

  // Load initial data when userId or filters change
  useEffect(() => {
    if (userId) {
      loadLeaveApplications();
    }
  }, [userId, loadLeaveApplications]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadLeaveApplications();
  }, [loadLeaveApplications]);

  // Date picker change handlers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      // If end date is before start date, update end date
      if (endDate && selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  function getStatusColor(status: string) {
    switch (status) {
      case 'Pending':
        return '#FF9800';
      case 'Approved':
        return '#4CAF50';
      case 'Rejected':
        return '#F44336';
      default:
        return '#999';
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave History</Text>
        <Link href="/leave/apply" asChild>
          <TouchableOpacity style={styles.applyButton}>
            <FontAwesome name="plus" size={14} color="white" style={styles.plusIcon} />
            <Text style={styles.applyButtonText}>Take Leave</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Leave Type:</Text>
          <Picker
            selectedValue={selectedType}
            onValueChange={(value) => setSelectedType(value)}
            style={styles.picker}
          >
            {LEAVE_TYPES.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
          
          <TouchableOpacity 
            style={styles.clearFilterButton} 
            onPress={clearFilters}
          >
            <Text style={styles.clearFilterText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dateFilterRow}>
          <Text style={styles.filterLabel}>Date Range:</Text>
          <View style={styles.datePickerContainer}>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text>{formatDisplayDate(startDate)}</Text>
            </TouchableOpacity>
            
            <Text style={styles.dateRangeSeparator}>to</Text>
            
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text>{formatDisplayDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
            maximumDate={new Date()}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
            minimumDate={startDate || undefined}
            maximumDate={new Date()}
          />
        )}
      </View>

      <RefreshWrapper onRefresh={handleRefresh}>
        <View style={styles.applicationsList}>
          {applications.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No leave applications found</Text>
            </View>
          ) : (
            applications.map((application) => (
              <View key={application.id} style={styles.applicationCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.leaveType}>
                    {application.leave_type + ' Leave'}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(application.status) }
                  ]}>
                    <Text style={styles.statusText}>{application.status}</Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.dateText}>
                    {formatDate(application.start_date)} - {formatDate(application.end_date)}
                    {' '}({application.period} day)
                  </Text>
                </View>

                <Text style={styles.reasonText} numberOfLines={2}>
                  {application.reason}
                </Text>
              </View>
            ))
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  plusIcon: {
    marginRight: 6,
  },
  applicationsList: {
    flex: 1,
    padding: 16,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    paddingBottom: 5,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterRow: {
    width: 330,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 5,
    backgroundColor: '#f9f9f9',
  },
  dateRangeSeparator: {
    marginHorizontal: 10,
    color: '#666',
  },
  clearFilterButton: {
    alignSelf: 'center',
    marginRight: -20,
    padding: 8,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#6A1B9A',
  },
  clearFilterText: {
    color: 'white',
    fontWeight: '500',
  },
  picker: {
    flex: 1,
    height: 55,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
  },
}); 