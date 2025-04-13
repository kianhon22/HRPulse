import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';

const LEAVE_TYPES = [
  'Annual',
  'Medical',
  'Emergency',
  'Unpaid',
];

export default function LeaveApplicationForm() {
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [attachment, setAttachment] = useState<{
    assets?: Array<{
      name: string;
      uri: string;
      mimeType?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateDays = (start: Date, end: Date) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1;
    return `${diffDays} `;
    // return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined, isStart: boolean) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }

    if (selectedDate) {
      if (isStart) {
        setStartDate(selectedDate);
        // If start date is after end date, update end date
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
      } else {
        // Only update end date if it's after start date
        if (selectedDate >= startDate) {
          setEndDate(selectedDate);
        } else {
          Alert.alert('Invalid Date', 'End date cannot be before start date');
        }
      }
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
      });

      if (result.assets && result.assets[0]) {
        setAttachment(result);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const uploadAttachment = async (userId: string): Promise<string | null> => {
    if (!attachment?.assets?.[0]) return null;

    const file = attachment.assets[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Convert URI to Blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('leaves')
        .upload(filePath, blob, {
          contentType: file.mimeType || 'application/octet-stream'
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('leaves')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const period = calculateDays(startDate, endDate);
      
      // Upload attachment if exists
      // const attachmentUrl = await uploadAttachment(user.id);

      const { error } = await supabase
        .from('leaves')
        .insert([
          {
            user_id: user.id,
            leave_type: leaveType,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            period,
            reason,
            status: 'Pending',
            // attachment_url: attachmentUrl,
          },
        ]);

      if (error) throw error;

      Alert.alert('Success', 'Leave application submitted successfully');
      router.back();
    } catch (error) {
      console.error('Error submitting leave application:', error);
      Alert.alert('Error', 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Leave Application Form</Text>
        <Text style={styles.subtitle}>Please provide information about your leave.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Leave Type:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={leaveType}
              onValueChange={(value: string) => setLeaveType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Choose leave type..." value="" />
              {LEAVE_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Dates:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text>Start: {startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(event, date) => handleDateChange(event, date, true)}
            />
          )}

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text>End: {endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              minimumDate={startDate}
              onChange={(event, date) => handleDateChange(event, date, false)}
            />
          )}

          <Text style={styles.periodText}>
            Period: {calculateDays(startDate, endDate)} day
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Enter reason..."
            value={reason}
            onChangeText={setReason}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Attachment:</Text>
          <View style={styles.uploadContainer}>
            <TextInput
              style={styles.uploadInput}
              placeholder="pdf, jpg files"
              value={attachment?.assets?.[0]?.name || ''}
              editable={false}
            />
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
            >
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Apply leave</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6A1B9A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#B39DDB',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  periodText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
}); 