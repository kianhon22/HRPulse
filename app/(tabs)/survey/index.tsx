import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Survey {
  id: string;
  title: string;
  type: string;
  description: string;
  is_active: boolean;
  is_editable: boolean;
  start_date: Date;
  end_date: Date;
  created_at: string;
  is_completed: boolean;
  is_within_date: boolean;
}

export default function SurveysScreen() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSurveysCallback = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      const today = new Date().toISOString();

      const { data: activeSurveys, error: activeError } = await supabase
        .from('surveys')
        .select('*')
        .gte('start_date', startOfYear)
        .lte('start_date', today)
        .order('start_date', { ascending: false });

      if (activeError) throw activeError;

      const { data: completedSurveys, error: completedError } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', user.id)
        .then(response => {
          if (response.error) throw response.error;
          const completedIds = new Set(response.data.map(s => s.survey_id));
          return { data: Array.from(completedIds), error: null };
        });

      if (completedError) throw completedError;

      const completedIdsSet = new Set(completedSurveys || []);

      const allSurveys = activeSurveys?.map(survey => ({
        ...survey,
        is_completed: completedIdsSet.has(survey.id),
        is_within_date: new Date() >= new Date(survey.start_date) && new Date() <= new Date(survey.end_date)
      })) || [];

      setSurveys(allSurveys);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSurveysCallback();

    const channel = supabase
      .channel('public:surveys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, payload => {
        console.log('Change received!', payload);
        loadSurveysCallback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses' }, payload => {
        console.log('Response change received!', payload);
        loadSurveysCallback();
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to surveys channel!');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Subscription Error:', err);
        }
        if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSurveysCallback]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSurveysCallback();
  }, [loadSurveysCallback]);

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <View style={styles.header}>
        <Text style={styles.title}>Surveys</Text>
      </View> */}

      <ScrollView 
        style={styles.surveyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {surveys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="clipboard" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No surveys available at the moment</Text>
          </View>
        ) : (
          surveys.map((survey) => (
            <TouchableOpacity
              key={survey.id}
              style={styles.surveyCard}
              onPress={() => {
                if (survey.is_completed) {
                  router.push(`/survey/${survey.id}`);
                } else if (survey.is_within_date) {
                  // Start Now button
                  router.push(`/survey/${survey.id}`);
                } else {
                  // View button
                  router.push(`/survey/${survey.id}`);
                }
              }}
              disabled={survey.is_completed || !survey.is_within_date}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.surveyTitle}>{survey.title}</Text>
                {survey.is_completed ? (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                ) : (
                  <View style={styles.notCompletedBadge}>
                    <Text style={styles.notCompletedText}>Not Completed</Text>
                  </View>
                )}
              </View>

              <Text style={styles.surveyDescription} numberOfLines={2}>
                {survey.description}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {format(new Date(survey.start_date), 'MMM dd, yyyy')} - {format(new Date(survey.end_date), 'MMM dd, yyyy')}
                </Text>
                <View style={styles.buttonContainer}>
                  {survey.is_completed ? (
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => router.push(`/survey/${survey.id}`)}
                    >
                      <Text style={styles.buttonText}>View</Text>
                    </TouchableOpacity>
                  ) : survey.is_within_date ? (
                    <TouchableOpacity 
                      style={styles.startButton}
                      onPress={() => router.push(`/survey/${survey.id}`)}
                    >
                      <Text style={styles.buttonText}>Start Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => router.push(`/survey/${survey.id}`)}
                    >
                      <Text style={styles.buttonText}>View</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
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
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  surveyList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  surveyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  surveyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  surveyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#999',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  notCompletedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notCompletedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  // anonymousBadge: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: '#f0f0f0',
  //   paddingHorizontal: 8,
  //   paddingVertical: 4,
  //   borderRadius: 12,
  // },
  // anonymousText: {
  //   color: '#666',
  //   fontSize: 12,
  //   marginLeft: 4,
  // },
  buttonContainer: {
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButton: {
    backgroundColor: '#757575',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 