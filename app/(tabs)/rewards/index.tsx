import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';
import Slider from '@react-native-community/slider';

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  image_url: string;
  is_active: boolean;
}

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 48) / numColumns;

export default function RewardsCatalogScreen() {
  const { userData } = getUserData();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [minPoints, setMinPoints] = useState(0);
  const [maxPoints, setMaxPoints] = useState(1000);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [highestPoints, setHighestPoints] = useState(1000);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRewards();
  }, []);

  useEffect(() => {
    filterRewards();
  }, [rewards, searchText, minPoints, maxPoints]);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) throw error;

      // Find highest points for slider maximum
      const highestPointsValue = data && data.length > 0 
        ? Math.max(...data.map(reward => reward.points)) 
        : 1000;
      
      setHighestPoints(highestPointsValue);
      setMaxPoints(highestPointsValue);
      setRewards(data || []);
      setFilteredRewards(data || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
      Alert.alert('Error', 'Failed to load rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterRewards = () => {
    const filtered = rewards.filter(reward => {
      const matchesSearch = reward.title.toLowerCase().includes(searchText.toLowerCase()) ||
                            reward.points.toString().includes(searchText);
      const matchesPoints = reward.points >= minPoints && reward.points <= maxPoints;
      return matchesSearch && matchesPoints;
    });
    
    setFilteredRewards(filtered);
  };

  const resetFilters = () => {
    setSearchText('');
    setMinPoints(0);
    setMaxPoints(highestPoints);
    setShowFilters(false);
  };

  const handleSelectReward = (reward: Reward) => {
    setSelectedReward(reward);
    setModalVisible(true);
  };

  const handleRedeemReward = async () => {
    if (!selectedReward || !userData) return;

    // Ensure points is a number
    const userPoints = typeof userData.points === 'number' ? userData.points : 0;

    if (userPoints < selectedReward.points) {
      Alert.alert('Insufficient Points', 'You do not have enough points to redeem this reward.');
      return;
    }

    try {
      setRedeemLoading(true);

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert([
          {
            user_id: userData.id,
            reward_id: selectedReward.id,
            points_spent: selectedReward.points,
            status: 'Pending',
            quantity: 1,
          },
        ]);

      if (redemptionError) throw redemptionError;

      // Deduct points from user
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: userPoints - selectedReward.points })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Redemption Successful',
        `You've successfully redeemed ${selectedReward.title}. Check your redemptions for status updates.`
      );
      
      setModalVisible(false);
      setSelectedReward(null);
      
    } catch (error) {
      console.error('Error redeeming reward:', error);
      Alert.alert('Error', 'Failed to redeem reward. Please try again.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const renderRewardItem = ({ item }: { item: Reward }) => (
    <TouchableOpacity 
      style={styles.rewardCard}
      onPress={() => handleSelectReward(item)}
    >
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.rewardImage} 
        resizeMode="cover"
      />
      <View style={styles.rewardCardContent}>
        <Text style={styles.rewardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rewardPoints}>{item.points} Points</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="gift" size={50} color="#ddd" />
      <Text style={styles.emptyText}>
        {searchText || minPoints > 0 || maxPoints < highestPoints
          ? 'No rewards match your filters'
          : 'No rewards available at the moment'}
      </Text>
      {(searchText || minPoints > 0 || maxPoints < highestPoints) && (
        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
          <Text style={styles.resetButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Convert userData.points to a number for safe comparisons
  const userPointsNumber = typeof userData?.points === 'number' ? userData.points : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.pointsDisplay}>
          <Text style={styles.pointsCount}>{userPointsNumber} points</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search rewards..."
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <FontAwesome5 name="times" size={16} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FontAwesome5 
              name="filter" 
              size={16} 
              color={showFilters || minPoints > 0 || maxPoints < highestPoints ? "#6A1B9A" : "#999"} 
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
            />
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A1B9A" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRewards}
          renderItem={renderRewardItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
      
      {/* Reward Detail Modal */}
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
            >
              <FontAwesome5 name="times" size={22} color="#333" />
            </TouchableOpacity>
            
            {selectedReward && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image 
                  source={{ uri: selectedReward.image_url || 'https://via.placeholder.com/250' }} 
                  style={styles.modalImage} 
                  resizeMode="cover"
                />
                
                <Text style={styles.modalTitle}>{selectedReward.title}</Text>
                
                <View style={styles.pointsContainer}>
                  <FontAwesome5 name="coins" size={16} color="#6A1B9A" />
                  <Text style={styles.modalPoints}>{selectedReward.points} Points</Text>
                </View>
                
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{selectedReward.description}</Text>
                
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceText}>
                    Your Balance: <Text style={styles.balanceAmount}>{userPointsNumber} points</Text>
                  </Text>
                  
                  {selectedReward.points > userPointsNumber ? (
                    <View style={styles.insufficientContainer}>
                      <FontAwesome5 name="exclamation-circle" size={14} color="#FF3B30" />
                      <Text style={styles.insufficientText}>
                        You need {selectedReward.points - userPointsNumber} more points
                      </Text>
                    </View>
                  ) : null}
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.confirmButton,
                      selectedReward.points > userPointsNumber || redeemLoading
                        ? styles.disabledButton
                        : {}
                    ]}
                    onPress={handleRedeemReward}
                    disabled={selectedReward.points > userPointsNumber || redeemLoading}
                  >
                    {redeemLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Redeem</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  headerContainer: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pointsDisplay: {
    alignItems: 'center',
    marginVertical: 12,
  },
  pointsCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  resetButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  rewardCard: {
    width: cardWidth,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rewardImage: {
    width: '100%',
    height: cardWidth * 0.8,
  },
  rewardCardContent: {
    padding: 12,
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    height: 20,
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A1B9A',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPoints: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6A1B9A',
    marginLeft: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  balanceContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  balanceText: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontWeight: 'bold',
    color: '#333',
  },
  insufficientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  insufficientText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f3f9',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6A1B9A',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 