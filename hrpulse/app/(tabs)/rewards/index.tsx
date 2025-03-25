import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Link } from 'expo-router';

interface Reward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  image_url: string | null;
  available: boolean;
}

export default function RewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRewardsAndPoints();
  }, []);

  async function loadRewardsAndPoints() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('available', true)
        .order('points_required', { ascending: true });

      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);

      // Calculate user points from recognitions
      const { data: recognitionsData, error: recognitionsError } = await supabase
        .from('recognitions')
        .select('points')
        .eq('to_user_id', user.id);

      if (recognitionsError) throw recognitionsError;

      // Sum up points from recognitions
      const totalPoints = (recognitionsData || []).reduce((sum, rec) => sum + (rec.points || 0), 0);

      // Subtract points from redemptions
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('points_spent')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (redemptionsError) throw redemptionsError;

      const spentPoints = (redemptionsData || []).reduce((sum, red) => sum + (red.points_spent || 0), 0);

      setUserPoints(totalPoints - spentPoints);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  const renderRewardItem = ({ item }: { item: Reward }) => {
    const canRedeem = userPoints >= item.points_required;

    return (
      <View style={styles.rewardCard}>
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.rewardImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.rewardContent}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <Text style={styles.rewardDescription}>{item.description}</Text>
          
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsRequired}>
              {item.points_required} points required
            </Text>
            {!canRedeem && (
              <Text style={styles.pointsNeeded}>
                {item.points_required - userPoints} more points needed
              </Text>
            )}
          </View>

          <Link href={`/rewards/${item.id}`} asChild>
            <TouchableOpacity
              style={[styles.redeemButton, !canRedeem && styles.redeemButtonDisabled]}
              disabled={!canRedeem}>
              <Text style={styles.redeemButtonText}>
                {canRedeem ? 'Redeem Reward' : 'Not Enough Points'}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading rewards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pointsBalance}>Your Points: {userPoints}</Text>
      </View>

      {rewards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No rewards available at the moment</Text>
        </View>
      ) : (
        <FlatList
          data={rewards}
          renderItem={renderRewardItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pointsBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
  },
  listContainer: {
    padding: 20,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rewardImage: {
    width: '100%',
    height: 200,
  },
  rewardContent: {
    padding: 20,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  pointsContainer: {
    marginBottom: 15,
  },
  pointsRequired: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  pointsNeeded: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 5,
  },
  redeemButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: '#ccc',
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
}); 