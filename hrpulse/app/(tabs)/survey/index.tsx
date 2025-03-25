import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Link } from 'expo-router';

interface Survey {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  start_date: string;
  end_date: string;
}

export default function SurveyScreen() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, []);

  async function loadSurveys() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;

      setSurveys(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const renderSurveyItem = ({ item }: { item: Survey }) => (
    <Link href={`/survey/${item.id}`} asChild>
      <TouchableOpacity style={styles.surveyCard}>
        <View style={styles.surveyHeader}>
          <Text style={styles.surveyTitle}>{item.title}</Text>
          {item.is_anonymous && (
            <View style={styles.anonymousBadge}>
              <Text style={styles.anonymousText}>Anonymous</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.surveyDescription}>{item.description}</Text>
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Available until {formatDate(item.end_date)}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading surveys...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {surveys.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active surveys available</Text>
        </View>
      ) : (
        <FlatList
          data={surveys}
          renderItem={renderSurveyItem}
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
  listContainer: {
    padding: 20,
  },
  surveyCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  surveyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  anonymousBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  anonymousText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  surveyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  dateContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
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