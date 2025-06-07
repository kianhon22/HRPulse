import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
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

const getModuleIcon = (module: string): string => {
  switch (module.toLowerCase()) {
    case 'leave':
      return 'calendar';
    case 'attendance':
      return 'clock';
    case 'recognition':
      return 'trophy';
    case 'survey':
      return 'list-alt';
    case 'reward':
    case 'rewards':
      return 'gift';
    case 'hr':
    case 'admin':
      return 'user-shield';
    default:
      return 'bell';
  }
};

const getModuleColor = (module: string): string => {
  switch (module.toLowerCase()) {
    case 'leave':
      return '#FF9800';
    case 'attendance':
      return '#2196F3';
    case 'recognition':
      return '#6A1B9A';
    case 'survey':
      return '#4CAF50';
    case 'reward':
    case 'rewards':
      return '#E91E63';
    case 'hr':
    case 'admin':
      return '#9C27B0';
    default:
      return '#757575';
  }
};

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

    // Subscribe to real-time notifications with immediate updates
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscription = supabase
          .channel('notifications_realtime')
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
              const newNotification = payload.new as Notification;
              setNotifications(current => [newNotification, ...current]);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Notification updated:', payload);
              const updatedNotification = payload.new as Notification;
              setNotifications(current => 
                current.map(notif => 
                  notif.id === updatedNotification.id ? updatedNotification : notif
                )
              );
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      }
    };

    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      // Any additional cleanup if needed
    };
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Only update if not already read
      if (!notification.is_read) {
        // Update notification as read in database
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        if (error) {
          console.error('Error updating notification:', error);
          return;
        }

        // Update local state immediately
        setNotifications(currentNotifications => 
          currentNotifications.map(notif => 
            notif.id === notification.id ? { ...notif, is_read: true } : notif
          )
        );
      }
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

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
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
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#6A1B9A']}
          tintColor="#6A1B9A"
        />
      }
    >
      {loading ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="bell" size={50} color="#ddd" />
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="bell-slash" size={50} color="#ddd" />
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
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <View style={styles.titleRow}>
                  <View style={[
                    styles.moduleIcon,
                    { backgroundColor: getModuleColor(notification.module) }
                  ]}>
                    <FontAwesome5 
                      name={getModuleIcon(notification.module)} 
                      size={14} 
                      color="white" 
                    />
                  </View>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.is_read && styles.unreadText
                  ]}>
                    {notification.title}
                  </Text>
                </View>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <View style={styles.notificationFooter}>
                <Text style={styles.timestamp}>
                  {formatTimestamp(notification.created_at)}
                </Text>
                <Text style={styles.moduleLabel}>
                  {notification.module}
                </Text>
              </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleLabel: {
    fontSize: 12,
    color: '#999',
  },
}); 