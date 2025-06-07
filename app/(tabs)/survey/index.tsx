import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSupabaseRealtime } from '../../../hooks/useSupabaseRealtime';
import RefreshWrapper from '../../../components/RefreshWrapper';
import { getUserData } from '../../../hooks/getUserData';
import { LinearGradient } from 'expo-linear-gradient';

interface Survey {
  id: string;
  title: string;
  type: string;
  description: string;
  status: string;
  start_date: Date;
  end_date: Date;
  created_at: string;
  is_completed: boolean;
  is_within_date: boolean;
}

export default function SurveysScreen() {
  const { userData } = getUserData();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize load function to prevent re-creation
  const loadSurveys = useCallback(async () => {
    if (!userData?.id) return;
    
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      const today = new Date().toISOString();

      const { data: activeSurveys, error: activeError } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_template', false)
        .in('status', ['Active', 'Closed'])
        .gte('start_date', startOfYear)
        .lte('start_date', today)
        .order('start_date', { ascending: false });

      if (activeError) throw activeError;

      const { data: completedSurveys, error: completedError } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', userData.id);

      if (completedError) throw completedError;

      const completedIdsSet = new Set(completedSurveys?.map(s => s.survey_id) || []);

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
    }
  }, [userData?.id]);

  // Stable callbacks for realtime updates
  const handleSurveyChange = useCallback(() => {
    loadSurveys();
  }, [loadSurveys]);
  
  const handleResponseChange = useCallback(() => {
    loadSurveys();
  }, [loadSurveys]);

  // Set up real-time subscriptions
  useSupabaseRealtime(
    'surveys',
    '*',
    undefined,
    undefined,
    handleSurveyChange
  );

  useSupabaseRealtime(
    'survey_responses',
    '*',
    'user_id',
    userData?.id,
    handleResponseChange
  );

  // Load initial data
  useEffect(() => {
    if (userData?.id) {
      loadSurveys();
    }
  }, [userData?.id, loadSurveys]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadSurveys();
  }, [loadSurveys]);

  // Format date helper
  const formatDate = useCallback((date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  if (loading && surveys.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RefreshWrapper onRefresh={handleRefresh}>
        <View style={styles.surveyList}>
          {surveys.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="clipboard" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No surveys available at the moment</Text>
            </View>
          ) : (
            surveys.map((survey) => (
              <TouchableOpacity
                key={survey.id}
                onPress={() => {
                  router.push(`/survey/${survey.id}`);
                }}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.surveyCard}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.surveyTitle}>{survey.title}</Text>
                    {survey.is_completed ? (
                      <LinearGradient
                        colors={['#4CAF50', '#66BB6A']}
                        style={styles.completedBadge}
                      >
                        <Text style={styles.statusText}>Completed</Text>
                      </LinearGradient>
                    ) : (survey.status == 'Closed' ? (
                      <LinearGradient
                        colors={['#F44336', '#FF6B6B']}
                        style={styles.endedBadge}
                      >
                        <Text style={styles.statusText}>Closed</Text>
                      </LinearGradient>
                    ) : (
                      <LinearGradient
                        colors={['#FF9800', '#FFB74D']}
                        style={styles.notCompletedBadge}
                      >
                        <Text style={styles.statusText}>Not Completed</Text>
                      </LinearGradient>
                    ))}
                  </View>

                  {survey?.description &&
                    <Text style={styles.surveyDescription} numberOfLines={2}>{survey.description} </Text>
                  }

                  <View style={styles.cardFooter}>
                    <View style={styles.dateSection}>
                      <Text style={styles.dateText}>
                        {format(new Date(survey.start_date), 'MMM dd, yyyy')} - {format(new Date(survey.end_date), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                    
                    <View style={styles.buttonSection}>
                      {survey.is_completed || survey.status == "Closed" ? (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => router.push(`/survey/${survey.id}`)}
                        >
                          <Text style={styles.buttonText}><FontAwesome5 name="eye" size={14} color="white"/> View</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => router.push(`/survey/${survey.id}`)}
                        >
                          <LinearGradient
                            colors={['#6A1B9A', '#8E24AA']}
                            style={styles.buttonGradient}
                          >
                            <FontAwesome5 name="play" size={14} color="white"/>
                            <Text style={styles.buttonText}>Start Now</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </View>
      </RefreshWrapper>
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
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  endedBadge: {
    backgroundColor: '#e64747',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notCompletedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  buttonContainer: {
    marginTop: 10,
  },
  // startButton: {
  //   backgroundColor: '#6A1B9A',
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 8,
  // },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#6A1B9A',
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
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
}); 