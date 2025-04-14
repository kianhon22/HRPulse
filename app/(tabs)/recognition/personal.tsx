import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';
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
  receiver_user?: {
    name: string;
    image_url?: string;
  };
}

export default function MyRecognitionScreen() {
  const { userData } = getUserData();
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [filteredRecognitions, setFilteredRecognitions] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'given' | 'received'>('received');
  const [selectedRecognition, setSelectedRecognition] = useState<Recognition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  
  // Supabase subscription ref
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (userData?.id) {
      loadRecognitions();
      setupSubscription();
    }
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userData]);

  useEffect(() => {
    filterRecognitions();
  }, [recognitions, searchText, activeTab]);

  const setupSubscription = async () => {
    if (!userData?.id) return;
    
    // Remove any existing subscription
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
    }
    
    // Set up subscription to recognitions table for this user
    const channel = supabase
      .channel(`recognition-personal-${userData.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'recognitions',
        filter: `nominator=eq.${userData.id},receiver=eq.${userData.id}`
      }, (payload) => {
        console.log('My recognition change received:', payload);
        // Reload recognitions when changes occur
        loadRecognitions();
      })
      .subscribe();
    
    subscriptionRef.current = channel;
  };

  const loadRecognitions = async () => {
    if (!userData?.id) return;
    
    try {
      setError(null);
      if (!refreshing) {
        setLoading(true);
      }
      
      // Get all recognitions where user is either nominator or receiver
      const { data, error } = await supabase
        .from('recognitions')
        .select(`
          *,
          nominator_user:nominator (name, image_url),
          receiver_user:receiver (name, image_url)
        `)
        .or(`nominator.eq.${userData.id},receiver.eq.${userData.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setRecognitions(data as Recognition[]);
        
        // Calculate total points for received recognitions that are approved
        const receivedPoints = data
          .filter(rec => rec.receiver === userData.id && rec.status === 'Approved')
          .reduce((sum, rec) => sum + (rec.points || 0), 0);
        
        setTotalPoints(receivedPoints);
      }
    } catch (error: any) {
      console.error('Error loading recognitions:', error);
      setError(error.message || 'Failed to load recognitions');
      Alert.alert('Error', 'Failed to load your recognitions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecognitions();
  }, [userData]);

  const filterRecognitions = useCallback(() => {
    if (!userData?.id) return;
    
    let filtered = recognitions;
    
    // Filter by tab
    if (activeTab === 'given') {
      filtered = filtered.filter(rec => rec.nominator === userData.id);
    } else {
      filtered = filtered.filter(rec => rec.receiver === userData.id);
    }
    
    // Filter by search
    if (searchText) {
      filtered = filtered.filter(rec => 
        rec.descriptions?.toLowerCase().includes(searchText.toLowerCase()) ||
        (activeTab === 'given' && rec.receiver_user?.name?.toLowerCase().includes(searchText.toLowerCase())) ||
        (activeTab === 'received' && rec.nominator_user?.name?.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    setFilteredRecognitions(filtered);
  }, [recognitions, searchText, activeTab, userData?.id]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return '#4CAF50';
      case 'Rejected': return '#F44336';
      default: return '#FFC107';
    }
  };

  const renderRecognitionItem = useCallback(({ item }: { item: Recognition }) => {
    const isNominator = item.nominator === userData?.id;
    const otherParty = isNominator ? item.receiver_user : item.nominator_user;
    
    return (
      <TouchableOpacity 
        style={styles.recognitionCard}
        onPress={() => {
          setSelectedRecognition(item);
          setModalVisible(true);
        }}
        accessibilityLabel={`Recognition ${isNominator ? 'given to' : 'received from'} ${otherParty?.name || 'Unknown'}`}
        accessibilityRole="button"
      >
        <View style={styles.recognitionHeader}>
          <View style={styles.userInfo}>
            <Image 
              source={{ 
                uri: otherParty?.image_url || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParty?.name || 'User')}&background=random` 
              }} 
              style={styles.userImage} 
              accessibilityLabel={`Profile of ${otherParty?.name || 'User'}`}
            />
            <View>
              <Text style={styles.relationLabel}>
                {isNominator ? 'You gave to:' : 'Received from:'}
              </Text>
              <Text style={styles.userName}>
                {otherParty?.name || 'Unknown User'}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.descriptions}
        </Text>
        
        <View style={styles.recognitionFooter}>
          <Text style={styles.pointsText}>{item.points} points</Text>
          <Text style={styles.dateText}>{format(parseISO(item.created_at), 'MMM d, yyyy')}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [userData?.id]);

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="trophy" size={50} color="#ddd" />
      <Text style={styles.emptyText}>
        {error ? `Error: ${error}` : 
         (activeTab === 'given' ? "You haven't given any recognitions yet." 
                               : "You haven't received any recognitions yet.")}
      </Text>
      {error && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={loadRecognitions}
          accessibilityLabel="Retry loading recognitions"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
      {activeTab === 'given' && !error && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/recognition/form' as any)}
          accessibilityLabel="Nominate someone"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Nominate Someone</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Total Points Banner */}
      <View style={styles.pointsBanner}>
        <Text style={styles.pointsLabel}>Your Total Points</Text>
        <Text style={styles.pointsValue}>{totalPoints}</Text>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'given' ? "Search by name or description..." : "Search by description..."}
            value={searchText}
            onChangeText={setSearchText}
            accessibilityLabel="Search recognitions"
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
      </View>
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
          accessibilityLabel="View received recognitions"
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'given' && styles.activeTab]}
          onPress={() => setActiveTab('given')}
          accessibilityLabel="View given recognitions"
          accessibilityRole="tab"
        >
          <Text style={[styles.tabText, activeTab === 'given' && styles.activeTabText]}>
            Given
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A1B9A" />
          <Text style={styles.loadingText}>Loading your recognitions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecognitions}
          renderItem={renderRecognitionItem}
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
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <FontAwesome5 name="times" size={22} color="#333" />
            </TouchableOpacity>
            
            {selectedRecognition && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecognition.status) }]}>
                    <Text style={styles.statusText}>{selectedRecognition.status}</Text>
                  </View>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From:</Text>
                    <Text style={styles.detailValue}>{selectedRecognition.nominator_user?.name || 'Unknown'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To:</Text>
                    <Text style={styles.detailValue}>{selectedRecognition.receiver_user?.name || 'Unknown'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points:</Text>
                    <Text style={styles.detailValueHighlight}>{selectedRecognition.points}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {format(parseISO(selectedRecognition.created_at), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Appreciation Notes</Text>
                  <Text style={styles.descriptionTextFull}>
                    {selectedRecognition.descriptions}
                  </Text>
                </View>
                
                {selectedRecognition.hr_remarks && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>HR Remarks</Text>
                    <Text style={styles.remarksText}>
                      {selectedRecognition.hr_remarks}
                    </Text>
                  </View>
                )}
              </ScrollView>
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
  pointsLabel: {
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
    padding: 16,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f9',
    borderRadius: 24,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6A1B9A',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  recognitionCard: {
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
  recognitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  relationLabel: {
    fontSize: 12,
    color: '#666',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  recognitionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#6A1B9A',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 6,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 70,
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  detailValueHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  descriptionTextFull: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  remarksText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    fontStyle: 'italic',
  },
}); 