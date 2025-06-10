import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSupabaseRealtime } from '../../../hooks/useSupabaseRealtime';
import RefreshWrapper from '../../../components/RefreshWrapper';
import { getUserData } from '../../../hooks/getUserData';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

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
  const { userData } = getUserData();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);
  const [remainingLeaves, setRemainingLeaves] = useState<number>(0);

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
    if (!userData?.id) return;
    
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;

      let query = supabase
        .from('leaves')
        .select('*')
        .eq('user_id', userData.id)
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
  }, [userData?.id, selectedType, startDate, endDate]);

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
    userData?.id,
    handleLeaveChange
  );

  // Calculate remaining leaves function (copied from home page)
  const calculateRemainingLeaves = useCallback(async () => {
    if (userData?.leave) {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('period')
          .eq('user_id', userData.id)
          .eq('status', 'Approved')
          .gte('start_date', startOfYear)
          .lte('end_date', endOfYear);

        if (error) throw error;

        const usedLeaves = data?.reduce((total, leave) => total + (leave.period || 0), 0) || 0;
        const remaining = userData.leave - usedLeaves;
        setRemainingLeaves(remaining);
        return remaining;

      } catch (error) {
        console.error('Error calculating remaining leaves:', error);
        setRemainingLeaves(userData.leave);
        return userData.leave;
      }
    }
    return 0;
  }, [userData]);

  // Check if user can apply for leave
  const handleApplyLeave = async () => {
    const remaining = await calculateRemainingLeaves();
    
    if (remaining <= 0) {
      Alert.alert(
        'Cannot Apply Leave',
        'You have no remaining leave days for this year. Please contact HR if you believe this is an error.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Navigate to apply leave page
    router.push('/leave/apply');
  };

  // Load initial data and calculate remaining leaves
  useEffect(() => {
    if (userData?.id) {
      loadLeaveApplications();
      calculateRemainingLeaves();
    }
  }, [userData?.id, loadLeaveApplications, calculateRemainingLeaves]);

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
        return '#808080';
    }
  }

  function getStatusGradient(status: string): [string, string] {
    switch (status) {
      case 'Pending':
        return ['#FF9800', '#FFB74D'];
      case 'Approved':
        return ['#4CAF50', '#66BB6A'];
      case 'Rejected':
        return ['#F44336', '#E57373'];
      default:
        return ['#808080', '#A0A0A0'];
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Cancel leave application
  const handleCancelLeave = async (leaveId: any) => {
    setSelectedCancelId(leaveId);
    setCancelModalVisible(true);
  };

  const confirmCancelLeave = async () => {
    if (!selectedCancelId) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leaves')
        .update({ status: 'Cancelled' })
        .eq('id', selectedCancelId);
      if (error) throw error;
      setCancelModalVisible(false);
      setSelectedCancelId(null);
      await loadLeaveApplications();
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel leave.');
    } finally {
      setLoading(false);
    }
  };

  const cancelModal = (
    <Modal
      visible={cancelModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setCancelModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Cancel Leave?</Text>
          <Text style={{ marginBottom: 20 }}>Are you sure you want to cancel this leave application?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#eee', marginRight: 10 }]}
              onPress={() => setCancelModalVisible(false)}
            >
              <Text style={{ color: '#333' }}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#F44336' }]}
              onPress={confirmCancelLeave}
            >
              <Text style={{ color: 'white' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.header}
      >
        {/* <Text style={styles.title}>Leave History</Text> */}
      </LinearGradient>

      <LinearGradient
        colors={['#F3E5F5', '#ffffff']}
        style={styles.filterContainer}
      >
        <View style={styles.filterRow}>
          <View style={styles.leaveTypeSection}>
            <Text style={[styles.filterLabel, { marginTop: 4 }]}>Leave Type:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedType}
                onValueChange={(value) => setSelectedType(value)}
                style={styles.picker}
                dropdownIconColor="#6A1B9A"
              >
                {LEAVE_TYPES.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={clearFilters}
          >
            <LinearGradient
              colors={['#6A1B9A', '#8E24AA']}
              style={styles.refreshButtonGradient}
            >
              <FontAwesome name="refresh" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>       
        
        <View style={styles.dateFilterRow}>
          <Text style={styles.filterLabel}>Date Range:</Text>
          <View style={styles.datePickerContainer}>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowStartDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <FontAwesome name="calendar" size={14} color="#6A1B9A" style={styles.dateIcon} />
                <Text style={styles.dateButtonText}>{formatDisplayDate(startDate)}</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.dateRangeSeparator}>to</Text>
            
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowEndDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <FontAwesome name="calendar" size={14} color="#6A1B9A" style={styles.dateIcon} />
                <Text style={styles.dateButtonText}>{formatDisplayDate(endDate)}</Text>
              </View>
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

        <View style={styles.remainingLeavesContainer}>
          <Text style={styles.remainingLeavesLabel}>Remaining Leaves: </Text>
          <Text style={[styles.remainingLeavesValue, remainingLeaves <= 0 && styles.noLeavesValue]}>
            {remainingLeaves} days
          </Text>
        </View>
      </LinearGradient>

      <RefreshWrapper onRefresh={handleRefresh}>
        <View style={styles.applicationsList}>
          {applications.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No leave applications found</Text>
            </View>
          ) : (
            applications.map((application) => (
              <LinearGradient
                key={application.id}
                colors={['#ffffff', '#f8f9fa']}
                style={styles.applicationCard}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.leaveType}>
                    {application.leave_type + ' Leave'}
                  </Text>
                  <LinearGradient
                    colors={getStatusGradient(application.status)}
                    style={styles.statusBadge}
                  >
                    <Text style={styles.statusText}>{application.status}</Text>
                  </LinearGradient>
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

                {/* Cancel button for Pending status */}
                {application.status === 'Pending' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelLeave(application.id)}
                  >
                    <LinearGradient
                      colors={['#F44336', '#E57373']}
                      style={styles.cancelButtonGradient}
                    >
                      <FontAwesome name="trash" size={19} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            ))
          )}
        </View>
        {cancelModal}
      </RefreshWrapper>

      {/* Floating Take Leave Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleApplyLeave}>
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={styles.floatingButtonGradient}
        >
          <FontAwesome name="plus" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
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
    // padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  applicationsList: {
    flex: 1,
    padding: 16,
  },
  applicationCard: {
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    padding: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    minWidth: 80,
    marginTop: -5,
    marginBottom: 5,
  },
  dateFilterRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateRangeSeparator: {
    marginHorizontal: 10,
    color: '#666',
    fontWeight: '500',
  },
  refreshButton: {
    alignSelf: 'center',
    borderRadius: 16,
    marginLeft: 30,
    marginRight: 10,
  },
  refreshButtonGradient: {
    padding: 8,
    borderRadius: 16,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    marginVertical: -10,
    flex: 1,
    color: '#333',
  },
  pickerWrapper: {
    color: '#333',
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: 40,
  },
  leaveTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 40,
    marginRight: 12,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 5,
  },
  dateButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
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
  cancelButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 20,
    elevation: 3,
  },
  cancelButtonGradient: {
    borderRadius: 20,
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 24,
    width: 300,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 2,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  remainingLeavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    // backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: -8,
  },
  remainingLeavesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  remainingLeavesValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  noLeavesValue: {
    color: '#F44336',
    fontWeight: 'bold',
  },
}); 