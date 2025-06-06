import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  module: string;
  module_id?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscription = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('New notification received:', payload);
              setNotifications(current => [payload.new as Notification, ...current]);
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      }
    };

    setupRealtimeSubscription();
  }, []);

  const handleNotificationPress = async (id: string) => {
    try {
      // Update notification as read in database
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Error updating notification:', error);
        return;
      }

      // Update local state
      setNotifications(notifications.map(notif => 
        notif.id === id ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Error in handleNotificationPress:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return format(date, 'MMM dd, yyyy');
      }
    } catch (error) {
      return 'Recently';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No new notifications</Text>
        </View>
      ) : (
        notifications.map(notification => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationItem,
              !notification.is_read && styles.unreadItem
            ]}
            onPress={() => handleNotificationPress(notification.id)}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={[
                  styles.notificationTitle,
                  !notification.is_read && styles.unreadText
                ]}>
                  {notification.title}
                </Text>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(notification.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  notificationItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  unreadItem: {
    backgroundColor: '#f0f0ff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  unreadText: {
    fontWeight: '700',
    color: '#000',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6A1B9A',
  },
}); 