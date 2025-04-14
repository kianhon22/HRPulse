import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Recognition {
  id: string;
  nominator: string;
  receiver: string;
  descriptions: string;
  points: number;
  created_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  hr_remarks?: string;
  nominator_user?: {
    name: string;
    image_url?: string;
  };
}

interface UserRecognitionSum {
  id: string;
  user_id: string;
  name: string;
  image_url?: string;
  total_points: number;
  recognitions: Recognition[];
  rank?: number;
}

export default function AllRecognitionScreen() {
  const { userData } = getUserData();
  const [userRecognitions, setUserRecognitions] = useState<UserRecognitionSum[]>([]);
  const [filteredRecognitions, setFilteredRecognitions] = useState<UserRecognitionSum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);
  
  // Supabase subscription ref
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  
  // Points range filter
  const [minPoints, setMinPoints] = useState(0);
  const [maxPoints, setMaxPoints] = useState(1000);
  const [highestPoints, setHighestPoints] = useState(1000);
  
  // Date range filter
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecognitionSum | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadRecognitions();
    
    // Set up real-time subscription
    setupSubscription();
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    filterRecognitions();
  }, [userRecognitions, searchText, minPoints, maxPoints, startDate, endDate]);

  const setupSubscription = async () => {
    // Remove any existing subscription
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
    }
    
    // Set up subscription to recognitions table for inserts, updates, and deletes
    const channel = supabase
      .channel('recognition-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'recognitions',
        filter: 'status=eq.Approved'
      }, (payload) => {
        console.log('Recognition change received:', payload);
        // Reload recognitions when changes occur
        loadRecognitions();
      })
      .subscribe();
    
    subscriptionRef.current = channel;
  };

  const loadRecognitions = async () => {
    try {
      setError(null);
      if (!refreshing) {
        setLoading(true);
      }
      
      // Get all approved recognitions
      const { data, error } = await supabase
        .from('recognitions')
        .select(`
          *,
          nominator_user:nominator (
            name,
            image_url
          ),
          receiver_user:receiver (
            name,
            image_url
          )
        `)
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setUserRecognitions([]);
        setFilteredRecognitions([]);
        setTotalPoints(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Group recognitions by receiver and calculate total points
      const recognitionsMap: { [key: string]: UserRecognitionSum } = {};
      let allPointsTotal = 0;
      
      (data || []).forEach((rec: any) => {
        const receiverId = rec.receiver;
        
        if (!recognitionsMap[receiverId]) {
          recognitionsMap[receiverId] = {
            id: receiverId,
            user_id: receiverId,
            name: rec.receiver_user?.name || 'Unknown User',
            image_url: rec.receiver_user?.image_url,
            total_points: 0,
            recognitions: [],
          };
        }
        
        // Only count within current month by default
        const recDate = parseISO(rec.created_at);
        if (isWithinInterval(recDate, { start: startDate, end: endDate })) {
          const points = rec.points || 0;
          recognitionsMap[receiverId].total_points += points;
          allPointsTotal += points;
          
          recognitionsMap[receiverId].recognitions.push({
            id: rec.id,
            nominator: rec.nominator,
            receiver: rec.receiver,
            descriptions: rec.descriptions,
            points: rec.points,
            created_at: rec.created_at,
            status: rec.status,
            hr_remarks: rec.hr_remarks,
            nominator_user: rec.nominator_user,
          });
        }
      });
      
      // Convert to array and sort by total points
      let userRecognitionsArray = Object.values(recognitionsMap)
        .filter(user => user.total_points > 0) // Only include users with points
        .sort((a, b) => b.total_points - a.total_points);
      
      // Assign ranks
      userRecognitionsArray = userRecognitionsArray.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
      
      // Find highest points for slider
      const highestPointsValue = userRecognitionsArray.length > 0 
        ? Math.max(...userRecognitionsArray.map(user => user.total_points))
        : 1000;
      
      setTotalPoints(allPointsTotal);
      setHighestPoints(highestPointsValue);
      setMaxPoints(highestPointsValue);
      setUserRecognitions(userRecognitionsArray);
      setFilteredRecognitions(userRecognitionsArray);
    } catch (error: any) {
      console.error('Error loading recognitions:', error);
      setError(error.message || 'Failed to load recognitions');
      Alert.alert('Error', 'Failed to load recognitions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecognitions();
  }, []);

  // Use memoized filtering function to improve performance
  const filterRecognitions = useCallback(() => {
    const filtered = userRecognitions.filter(user => {
      // Search in both name and recognition descriptions
      const matchesSearch = searchText ? (
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.recognitions.some(rec => 
          rec.descriptions?.toLowerCase().includes(searchText.toLowerCase())
        )
      ) : true;
      
      const matchesPoints = user.total_points >= minPoints && user.total_points <= maxPoints;
      
      // Filter recognitions within date range
      const recognitionsInRange = user.recognitions.filter(rec => {
        const recDate = parseISO(rec.created_at);
        return isWithinInterval(recDate, { start: startDate, end: endDate });
      });
      
      // Only include users who have recognitions in the date range
      return matchesSearch && matchesPoints && recognitionsInRange.length > 0;
    });
    
    setFilteredRecognitions(filtered);
  }, [userRecognitions, searchText, minPoints, maxPoints, startDate, endDate]);

  const resetFilters = () => {
    setSearchText('');
    setMinPoints(0);
    setMaxPoints(highestPoints);
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
    setShowFilters(false);
  };

  const handleSelectUser = (user: UserRecognitionSum) => {
    // Filter user's recognitions to only include those within the date range
    const updatedUser = {
      ...user,
      recognitions: user.recognitions.filter(rec => {
        const recDate = parseISO(rec.created_at);
        return isWithinInterval(recDate, { start: startDate, end: endDate });
      })
    };
    
    setSelectedUser(updatedUser);
    setModalVisible(true);
  };

  // Memoize user items to prevent unnecessary re-renders
  const renderUserItem = useCallback(({ item, index }: { item: UserRecognitionSum, index: number }) => {
    const isTopThree = item.rank && item.rank <= 3;
    
    return (
      <TouchableOpacity 
        style={[
          styles.userCard,
          isTopThree ? styles.topThreeCard : undefined
        ]}
        onPress={() => handleSelectUser(item)}
        accessibilityLabel={`${item.name}, Rank ${item.rank}, ${item.total_points} points`}
        accessibilityRole="button"
      >
        <View style={styles.rankContainer}>
          {isTopThree ? (
            <View style={[styles.topThreeRankBadge, getTopThreeStyle(item.rank)]}>
              <Text style={styles.topThreeRankText}>{item.rank}</Text>
            </View>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>
        
        <Image 
          source={{ 
            uri: item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` 
          }} 
          style={styles.userImage} 
          accessibilityLabel={`Profile picture of ${item.name}`}
        />
        
        <View style={styles.userInfo}>
          <Text style={[
            styles.userName,
            isTopThree ? styles.topThreeName : undefined
          ]}>
            {item.name}
          </Text>
          <Text style={styles.recognitionCount}>
            {item.recognitions.length} recognition{item.recognitions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.pointsContainer}>
          <Text style={[
            styles.pointsText,
            isTopThree ? styles.topThreePoints : undefined
          ]}>
            {item.total_points}
          </Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const getTopThreeStyle = (rank?: number) => {
    switch (rank) {
      case 1:
        return styles.firstRank;
      case 2:
        return styles.secondRank;
      case 3:
        return styles.thirdRank;
      default:
        return {};
    }
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="trophy" size={50} color="#ddd" />
      <Text style={styles.emptyText}>
        {error ? `Error: ${error}` : 
          (searchText || minPoints > 0 || maxPoints < highestPoints ||
          startDate > startOfMonth(new Date()) || endDate < endOfMonth(new Date())
            ? 'No recognitions match your filters'
            : 'No recognitions available for this month')}
      </Text>
      {error && (
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={loadRecognitions}
          accessibilityLabel="Retry loading recognitions"
        >
          <Text style={styles.resetButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
      {(searchText || minPoints > 0 || maxPoints < highestPoints ||
        startDate > startOfMonth(new Date()) || endDate < endOfMonth(new Date())) && !error && (
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={resetFilters}
          accessibilityLabel="Reset all filters"
        >
          <Text style={styles.resetButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRecognitionItem = (recognition: Recognition) => (
    <View key={recognition.id} style={styles.recognitionItem}>
      <View style={styles.recognitionHeader}>
        <View style={styles.nominatorInfo}>
          <Text style={styles.nominatorLabel}>Nominated by:</Text>
          <Text style={styles.nominatorName}>
            {recognition.nominator_user?.name || 'Unknown User'}
          </Text>
        </View>
        
        <View style={styles.recognitionPoints}>
          <Text style={styles.recognitionPointsText}>{recognition.points} points</Text>
        </View>
      </View>
      
      <Text style={styles.recognitionDescription}>{recognition.descriptions}</Text>
      
      <View style={styles.recognitionFooter}>
        <Text style={styles.recognitionDate}>
          {format(parseISO(recognition.created_at), 'MMM d, yyyy')}
        </Text>
      </View>
    </View>
  );

  const handleDateChange = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }
    
    if (selectedDate) {
      if (type === 'start') {
        setStartDate(selectedDate);
        // Ensure end date is not earlier than start date
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
      } else if (type === 'end') {
        setEndDate(selectedDate);
        // Ensure start date is not later than end date
        if (selectedDate < startDate) {
          setStartDate(selectedDate);
        }
      }
    }
    
    // Close date pickers on iOS
    if (Platform.OS === 'ios') {
      if (type === 'start') {
        setShowStartDatePicker(false);
      } else if (type === 'end') {
        setShowEndDatePicker(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Total Points Banner */}
      <View style={styles.pointsBanner}>
        <Text style={styles.bannerPointsLabel}>Total Recognition Points</Text>
        <Text style={styles.pointsValue}>{totalPoints}</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or description..."
            value={searchText}
            onChangeText={setSearchText}
            accessibilityLabel="Search by name or recognition description"
          />
          {searchText ? (
            <TouchableOpacity 
              onPress={() => setSearchText('')}
              accessibilityLabel="Clear search text"
            >
              <FontAwesome5 name="times" size={16} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityLabel={showFilters ? "Hide filters" : "Show filters"}
          accessibilityRole="button"
        >
          <FontAwesome5 
            name="filter" 
            size={16} 
            color={showFilters || minPoints > 0 || maxPoints < highestPoints ||
                  startDate > startOfMonth(new Date()) || endDate < endOfMonth(new Date())
                  ? "#6A1B9A" : "#999"} 
          />
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Points Range</Text>
          <View style={styles.rangeContainer}>
            <Text style={styles.rangeValue}>{minPoints}</Text>
            <Text style={styles.rangeLabel}>to</Text>
            <Text style={styles.rangeValue}>{maxPoints}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={highestPoints}
            step={10}
            value={minPoints}
            onValueChange={setMinPoints}
            minimumTrackTintColor="#6A1B9A"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#6A1B9A"
            accessibilityLabel={`Minimum points: ${minPoints}`}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={highestPoints}
            step={10}
            value={maxPoints}
            onValueChange={setMaxPoints}
            minimumTrackTintColor="#6A1B9A"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#6A1B9A"
            accessibilityLabel={`Maximum points: ${maxPoints}`}
          />
          
          <Text style={[styles.filterTitle, { marginTop: 16 }]}>Date Range</Text>
          <View style={styles.dateContainer}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
              accessibilityLabel={`Select start date, currently ${format(startDate, 'MMMM d, yyyy')}`}
              accessibilityRole="button"
            >
              <Text style={styles.dateLabel}>From:</Text>
              <Text style={styles.dateValue}>{format(startDate, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
              accessibilityLabel={`Select end date, currently ${format(endDate, 'MMMM d, yyyy')}`}
              accessibilityRole="button"
            >
              <Text style={styles.dateLabel}>To:</Text>
              <Text style={styles.dateValue}>{format(endDate, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
          </View>
          
          {showStartDatePicker && (
            <DateTimePicker
              testID="startDatePicker"
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, 'start')}
              style={styles.datePicker}
            />
          )}
          
          {showEndDatePicker && (
            <DateTimePicker
              testID="endDatePicker"
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, 'end')}
              style={styles.datePicker}
            />
          )}
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={resetFilters}
            accessibilityLabel="Reset all filters"
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A1B9A" />
          <Text style={styles.loadingText}>Loading recognitions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecognitions}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6A1B9A']}
              tintColor="#6A1B9A"
            />
          }
        />
      )}
      
      {/* Recognition Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              <FontAwesome5 name="times" size={22} color="#333" />
            </TouchableOpacity>
            
            {selectedUser && (
              <>
                <Text style={styles.modalTitle}>{selectedUser.name}'s Recognitions</Text>
                
                <ScrollView 
                  style={styles.recognitionsList}
                  // contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedUser.recognitions.map(recognition => renderRecognitionItem(recognition))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/recognition/form' as any)}
        accessibilityLabel="Add new recognition"
        accessibilityRole="button"
      >
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  pointsBanner: {
    backgroundColor: '#6A1B9A',
    padding: 16,
    alignItems: 'center',
  },
  bannerPointsLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rangeValue: {
    fontSize: 16,
    color: '#6A1B9A',
    fontWeight: '600',
  },
  rangeLabel: {
    fontSize: 14,
    color: '#666',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f1f3f9',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#6A1B9A',
    fontWeight: '600',
  },
  datePicker: {
    marginVertical: 10,
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f3f9',
  },
  resetButtonText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topThreeCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  topThreeRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topThreeRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  firstRank: {
    backgroundColor: '#FFD700',
  },
  secondRank: {
    backgroundColor: '#C0C0C0',
  },
  thirdRank: {
    backgroundColor: '#CD7F32',
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
    marginBottom: 4,
  },
  topThreeName: {
    fontWeight: '700',
    color: '#000',
  },
  recognitionCount: {
    fontSize: 14,
    color: '#666',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 2,
  },
  topThreePoints: {
    fontSize: 22,
    color: '#FF9800',
  },
  pointsLabel: {
    fontSize: 12,
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
    marginTop: 12,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '75%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    // flexShrink: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  recognitionsList: {
    flexGrow: 1,
    marginTop: 8,
  },
  recognitionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recognitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nominatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nominatorLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  nominatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  recognitionPoints: {
    backgroundColor: '#f0e6f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recognitionPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  recognitionDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  recognitionFooter: {
    alignItems: 'flex-end',
  },
  recognitionDate: {
    fontSize: 12,
    color: '#888',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
}); 