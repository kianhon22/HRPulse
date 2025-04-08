import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

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

  useEffect(() => {
    loadLeaveApplications();
  }, [selectedType]);

  async function loadLeaveApplications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;

      let query = supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', yearStart)
        .order('created_at', { ascending: false });

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
  }

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
        <Text style={styles.title}>Application History</Text>
        <Link href="../apply" asChild>
          <TouchableOpacity style={styles.applyButton}>
            <FontAwesome name="plus" size={14} color="white" style={styles.plusIcon} />
            <Text style={styles.applyButtonText}>Take Leave</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.filterContainer}>
        <Picker
          selectedValue={selectedType}
          onValueChange={(value) => setSelectedType(value)}
          style={styles.picker}
        >
          {LEAVE_TYPES.map((type) => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>

      <ScrollView style={styles.applicationsList}>
        {applications.map((application) => (
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
                {' '}({application.period} days)
              </Text>
            </View>

            <Text style={styles.reasonText} numberOfLines={2}>
              {application.reason}
            </Text>
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
    paddingBottom: 5
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  picker: {
    height: 50,
  },
}); 