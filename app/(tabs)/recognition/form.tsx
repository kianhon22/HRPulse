import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Image,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';
import { router } from 'expo-router';

interface User {
  id: string;
  name: string;
  email: string;
  image_url?: string;
  department?: string;
  position?: string;
}

// Recognition point options with descriptions
const RECOGNITION_OPTIONS = [
  { value: 100, label: 'Simple Thanks', description: 'For small but meaningful contributions' },
  { value: 200, label: 'Significant Effort or Achievement', description: 'Completion of major task' },
  { value: 300, label: 'Innovation and Creativity', description: 'Successful implementation of a new idea or solution that brings measurable value.' },
  { value: 500, label: 'Customer Excellence', description: 'Positive customer feedback, successful resolution of a difficult issue or building long term customer relationships.' },
  { value: 700, label: 'Leadership Excellence', description: 'Effective leadership in managing projects, mentoring others or influencing positive outcomes across the organization.' },
  { value: 800, label: 'Major Business Impact', description: 'Increased sales, new client acquisition or process improvements with high financial impact.' },
  { value: 1000, label: 'Department Recognition', description: 'Successful completion of key departmental projects or initiatives, innovative process improvements or significant cost savings.' },
];

export default function RecognitionForm() {
  const { userData } = getUserData();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showPointsPicker, setShowPointsPicker] = useState(false);
  
  // Form fields
  const [receiver, setReceiver] = useState<User | null>(null);
  const [description, setDescription] = useState('');
  const [selectedPointOption, setSelectedPointOption] = useState<typeof RECOGNITION_OPTIONS[0] | null>(null);
  
  // Form validation
  const [errors, setErrors] = useState({
    receiver: false,
    description: false,
    points: false,
  });

  useEffect(() => {
    if (userData?.id) {
      loadUsers();
    }
  }, [userData]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(searchText.toLowerCase())) ||
        (user.position && user.position.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const loadUsers = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, image_url, department, position')
        .eq('role', 'employee')
        .neq('id', userData?.id)
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        setUsers(data);
        setFilteredUsers(searchText.trim() ? 
          data.filter(user => 
            user.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (user.department && user.department.toLowerCase().includes(searchText.toLowerCase())) ||
            (user.position && user.position.toLowerCase().includes(searchText.toLowerCase()))
          ) : data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, []);

  const validateForm = () => {
    const newErrors = {
      receiver: !receiver,
      description: !description,
      points: !selectedPointOption,
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form before submitting.');
      return;
    }
    
    if (!userData?.id || !receiver || !selectedPointOption) {
      Alert.alert('Error', 'Missing required information. Please try again.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('recognitions')
        .insert({
          nominator: userData.id,
          receiver: receiver.id,
          descriptions: description.trim(),
          points: selectedPointOption.value,
          status: 'Pending', // All new recognitions start as pending for HR approval
        });
      
      if (error) throw error;
      
      Alert.alert(
        'Recognition Submitted',
        'Your recognition has been submitted successfully and is pending approval.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting recognition:', error);
      Alert.alert('Error', 'Failed to submit recognition. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectUser = (user: User) => {
    setReceiver(user);
    setShowUserPicker(false);
    setErrors({...errors, receiver: false});
  };

  const selectPointOption = (option: typeof RECOGNITION_OPTIONS[0]) => {
    setSelectedPointOption(option);
    setShowPointsPicker(false);
    setErrors({...errors, points: false});
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      onPress={() => selectUser(item)}
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="button"
    >
      <Image 
        source={{ 
          uri: item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` 
        }} 
        style={styles.userImage} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.position && (
          <Text style={styles.userDetail}>{item.position}</Text>
        )}
        {item.department && (
          <Text style={styles.userDetail}>{item.department}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPointOption = ({ item }: { item: typeof RECOGNITION_OPTIONS[0] }) => (
    <TouchableOpacity 
      style={styles.pointOptionItem} 
      onPress={() => selectPointOption(item)}
      accessibilityLabel={`Select ${item.label} - ${item.value} points`}
      accessibilityRole="button"
    >
      <View style={styles.pointOptionHeader}>
        <Text style={styles.pointOptionValue}>{item.value}</Text>
        <Text style={styles.pointOptionLabel}>{item.label}</Text>
      </View>
      <Text style={styles.pointOptionDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <FontAwesome5 name="arrow-left" size={18} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nominate for Recognition</Text>
        <View style={styles.placeholder} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Select Employee */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Employee <Text style={styles.asterisk}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.input, errors.receiver && styles.inputError]} 
              onPress={() => setShowUserPicker(true)}
              accessibilityLabel="Select employee for recognition"
              accessibilityRole="button"
            >
              {receiver ? (
                <View style={styles.selectedUser}>
                  <Image 
                    source={{ 
                      uri: receiver.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(receiver.name)}&background=random` 
                    }} 
                    style={styles.selectedUserImage} 
                  />
                  <Text style={styles.selectedUserName}>{receiver.name}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select an employee</Text>
              )}
              <FontAwesome5 name="chevron-down" size={14} color="#999" />
            </TouchableOpacity>
            {errors.receiver && (
              <Text style={styles.errorText}>Please select an employee</Text>
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Points <Text style={styles.asterisk}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.input, errors.points && styles.inputError]} 
              onPress={() => setShowPointsPicker(true)}
              accessibilityLabel="Select recognition points"
              accessibilityRole="button"
            >
              {selectedPointOption ? (
                <View style={styles.selectedOption}>
                  <Text style={styles.selectedPointValue}>{selectedPointOption.value}</Text>
                  <Text style={styles.selectedOptionName}>{selectedPointOption.label}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select Recognition Points</Text>
              )}
              <FontAwesome5 name="chevron-down" size={14} color="#999" />
            </TouchableOpacity>
            {errors.points && (
              <Text style={styles.errorText}>Please select recognition points</Text>
            )}
          </View>
          
          {/* Recognition Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description <Text style={styles.asterisk}>*</Text></Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Elaborate why the employee deserves recognition"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (text.trim().length >= 10) {
                  setErrors({...errors});
                }
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Recognition description"
            />
            {errors.description && (
              <Text style={styles.errorText}>Please provide a detailed description</Text>
            )}
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityLabel="Submit recognition"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Recognition</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              * Recognitions will be reviewed and approved by HR before the points are awarded
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* User Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUserPicker}
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowUserPicker(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <FontAwesome5 name="times" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, department, or position"
                value={searchText}
                onChangeText={setSearchText}
                accessibilityLabel="Search employees"
              />
              {searchText ? (
                <TouchableOpacity 
                  onPress={() => setSearchText('')}
                  accessibilityLabel="Clear search"
                >
                  <FontAwesome5 name="times" size={16} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6A1B9A" />
                <Text style={styles.loadingText}>Loading employees...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.userList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#6A1B9A']}
                    tintColor="#6A1B9A"
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchText ? "No employees found matching your search." : "No employees available."}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Points Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPointsPicker}
        onRequestClose={() => setShowPointsPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recognition Points</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPointsPicker(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <FontAwesome5 name="times" size={22} color="#333" />
              </TouchableOpacity>
            </View>
                        
            <FlatList
              data={RECOGNITION_OPTIONS}
              renderItem={renderPointOption}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pointsList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#F44336',
  },
  placeholderText: {
    color: '#999',
  },
  textArea: {
    color: '#333',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#6A1B9A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    marginBottom: 30,
  },
  noteText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'left',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    textAlign: 'center',
  },
  closeButton: {
    padding: 6,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    margin: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  userList: {
    paddingHorizontal: 16,
  },
  pointsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f9',
  },
  pointOptionItem: {
    backgroundColor: '#f9f9fc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6A1B9A',
  },
  pointOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pointOptionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginRight: 8,
    minWidth: 40,
  },
  pointOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  pointOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  selectedUserName: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPointValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginRight: 8,
  },
  selectedOptionName: {
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  asterisk: {
    color: '#F44336',
    fontWeight: 'bold',
  },
}); 