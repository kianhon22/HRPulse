import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../supabase';
import { getUserData } from '../../../hooks/getUserData';

interface Reward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  image_url: string | null;
  is_active: boolean;
  terms_conditions: string | null;
}

export default function RewardDetailsScreen() {
  const { userData } = getUserData();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [reward, setReward] = useState<Reward | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadRewardAndPoints();
  }, [id, userData]);

  async function loadRewardAndPoints() {
    try {
      if (!userData?.id) return;

      // Load reward details
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', id)
        .single();

      if (rewardError) throw rewardError;
      setReward(rewardData);

      // Calculate user points
      const { data: recognitionsData, error: recognitionsError } = await supabase
        .from('recognitions')
        .select('points')
        .eq('to_user_id', userData.id)
        .eq('status', 'Approved');

      if (recognitionsError) throw recognitionsError;
      const totalPoints = (recognitionsData || []).reduce((sum, rec) => sum + (rec.points || 0), 0);

      // Get spent points
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('points_spent')
        .eq('user_id', userData.id)
        .eq('status', 'Completed');

      if (redemptionsError) throw redemptionsError;
      const spentPoints = (redemptionsData || []).reduce((sum, red) => sum + (red.points_spent || 0), 0);

      setUserPoints(totalPoints - spentPoints);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!reward) return;
    
    try {
      setRedeeming(true);
      if (!userData?.id) {
        throw new Error('User not authenticated');
      }

      if (userPoints < reward.points_required) {
        throw new Error('Insufficient points');
      }

      const { error } = await supabase
        .from('reward_redemptions')
        .insert({
          user_id: userData.id,
          reward_id: reward.id,
          points_spent: reward.points_required,
          status: 'Pending'
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your reward redemption request has been submitted successfully. HR will process your request shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!reward) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Reward not found</Text>
      </View>
    );
  }

  const canRedeem = userPoints >= reward.points_required && reward.is_active === true;

  return (
    <ScrollView style={styles.container}>
      {reward.image_url && (
        <Image
          source={{ uri: reward.image_url }}
          style={styles.rewardImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{reward.title}</Text>
        <Text style={styles.description}>{reward.description}</Text>

        <View style={styles.pointsInfo}>
          <Text style={styles.pointsRequired}>Points Required: {reward.points_required}</Text>
          <Text style={styles.userPoints}>Your Points: {userPoints}</Text>
          {userPoints < reward.points_required && (
            <Text style={styles.pointsNeeded}>
              {reward.points_required - userPoints} more points needed
            </Text>
          )}
        </View>

        {reward.terms_conditions && (
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{reward.terms_conditions}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.redeemButton, !canRedeem && styles.redeemButtonDisabled]}
          onPress={handleRedeem}
          disabled={!canRedeem || redeeming}>
          <Text style={styles.redeemButtonText}>
            {redeeming ? 'Processing...' : canRedeem ? 'Redeem Reward' : 'Not Available'}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  rewardImage: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  pointsInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pointsRequired: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 5,
  },
  userPoints: {
    fontSize: 16,
    color: '#666',
  },
  pointsNeeded: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 5,
  },
  termsContainer: {
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
}); 