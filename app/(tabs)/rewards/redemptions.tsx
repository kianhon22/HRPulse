import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';
import { format, parseISO } from 'date-fns';
import RefreshWrapper from '../../../components/RefreshWrapper';

interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  quantity: number;
  status: 'Pending' | 'Completed';
  created_at: string;
  updated_at: string;
  reward: {
    title: string;
    image_url: string;
  };
}

export default function RedemptionsScreen() {
  const { userData } = getUserData();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'All'>('All');

  useEffect(() => {
    if (userData) {
      loadRedemptions();
    }
  }, [userData]);

  const loadRedemptions = async () => {
    if (!userData) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          reward:reward_id (
            title,
            image_url
          )
        `)
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRedemptions(data as Redemption[] || []);
    } catch (error) {
      console.error('Error loading redemptions:', error);
      Alert.alert('Error', 'Failed to load redemption history.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh for pull-to-refresh
  const handleRefresh = async () => {
    await loadRedemptions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FFC107';
      case 'Completed':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const filteredRedemptions = activeTab === 'All' 
    ? redemptions 
    : redemptions.filter(item => item.status === activeTab);

  const renderRedemptionItem = ({ item }: { item: Redemption }) => (
    <View style={styles.redemptionCard}>
      <Image 
        source={{ uri: item.reward?.image_url || 'https://via.placeholder.com/80' }} 
        style={styles.redemptionImage} 
        resizeMode="cover"
      />
      
      <View style={styles.redemptionContent}>
        <Text style={styles.redemptionTitle}>{item.reward?.title || 'Unknown Reward'}</Text>
        
        <View style={styles.redemptionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Points spent:</Text>
            <Text style={styles.detailValue}>{item.points_spent}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {format(parseISO(item.created_at), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.statusContainer}>
        <View 
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="gift" size={50} color="#ddd" />
      <Text style={styles.emptyText}>
        No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} reward redemptions
      </Text>
      {activeTab !== 'All' && (
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => setActiveTab('All')}
        >
          <Text style={styles.viewAllButtonText}>View All Redemptions</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabsContainer}>
        {(['All', 'Pending', 'Completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === tab && styles.activeTabText
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A1B9A" />
          <Text style={styles.loadingText}>Loading redemptions...</Text>
        </View>
      ) : (
        <RefreshWrapper onRefresh={handleRefresh}>
          <FlatList
            data={filteredRedemptions}
            renderItem={renderRedemptionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyComponent}
            scrollEnabled={false}
          />
        </RefreshWrapper>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6A1B9A',
  },
  tabText: {
    fontSize: 14,
    color: 'black',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  redemptionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  redemptionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  redemptionContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  redemptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  redemptionDetails: {
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  viewAllButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  viewAllButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
}); 