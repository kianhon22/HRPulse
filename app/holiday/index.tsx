import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { format, parseISO } from 'date-fns';
import RefreshWrapper from '../../components/RefreshWrapper';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'National' | 'Religious' | 'State' | 'Other';
  description?: string;
}

export default function HolidayScreen() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  // Memoize fetching functions
  const fetchHolidaysFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`https://calendarific.com/api/v2/holidays?&api_key=n1xP6cmnJwfCYwAXvqyI8HSaITShLRwq&country=MY&year=${year}`);
      const json = await response.json();
  
      if (!json.response || !json.response.holidays) {
        throw new Error('Invalid response from Calendarific');
      }
  
      const holidaysFromAPI = json.response.holidays.map((item: any, index: number) => ({
        id: `${year}-${index}`,
        name: item.name,
        date: item.date.iso,
        type: mapType(item.type),
        description: item.description || 'No description available.',
      }));
  
      setHolidays(holidaysFromAPI);
    } catch (err) {
      console.error('Error fetching holidays from Calendarific API:', err);
      setError('Unable to load holidays. Please try again later.');
    }
  }, [year]);
  
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchHolidaysFromAPI();      
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchHolidaysFromAPI]);

  // Load holidays when year changes
  useEffect(() => {
    fetchHolidays();
  }, [year, fetchHolidays]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await fetchHolidays();
  }, [fetchHolidays]);
  
  // Helper functions
  const mapType = useCallback((types: string[]): Holiday['type'] => {
    if (types.includes('National holiday')) return 'National';
    if (types.includes('Religious')) return 'Religious';
    if (types.includes('Local holiday')) return 'State';
    return 'Other';
  }, []);
  
  const getHolidayIcon = useCallback((type: string) => {
    switch (type) {
      case 'National':
        return <FontAwesome5 name="flag" size={20} color="#D81B60" />;
      case 'Religious':
        return <FontAwesome5 name="pray" size={20} color="#5E35B1" />;
      case 'State':
        return <FontAwesome5 name="landmark" size={20} color="#1E88E5" />;
      default:
        return <FontAwesome5 name="calendar" size={20} color="#00897B" />;
    }
  }, []);

  const renderYearSelector = useCallback(() => {
    return (
      <View style={styles.yearSelector}>
        <TouchableOpacity 
          style={styles.yearButton}
          onPress={() => setYear(year - 1)}
        >
          <FontAwesome5 name="chevron-left" size={18} color="#6A1B9A" />
        </TouchableOpacity>
        
        <Text style={styles.yearText}>{year}</Text>
        
        <TouchableOpacity 
          style={styles.yearButton}
          onPress={() => setYear(year + 1)}
        >
          <FontAwesome5 name="chevron-right" size={18} color="#6A1B9A" />
        </TouchableOpacity>
      </View>
    );
  }, [year]);

  const groupHolidaysByMonth = useCallback(() => {
    const grouped: { [key: string]: Holiday[] } = {};
    
    holidays.forEach(holiday => {
      const monthYear = format(parseISO(holiday.date), 'MMMM');
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(holiday);
    });
    
    return grouped;
  }, [holidays]);

  const getTypeStyle = useCallback((type: string) => {
    switch (type) {
      case 'National':
        return styles.nationalType;
      case 'Religious':
        return styles.religiousType;
      case 'State':
        return styles.stateType;
      default:
        return styles.otherType;
    }
  }, []);

  const renderHolidayItem = useCallback((holiday: Holiday) => {
    return (
      <TouchableOpacity 
        key={holiday.id} 
        style={styles.holidayCard}
        onPress={() => holiday.description && Alert.alert(holiday.name, holiday.description)}
      >
        <View style={styles.holidayIconContainer}>
          {getHolidayIcon(holiday.type)}
        </View>
        
        <View style={styles.holidayContent}>
          <Text style={styles.holidayName}>{holiday.name}</Text>
          <View style={styles.holidayMeta}>
            <Text style={styles.holidayDate}>
              {format(parseISO(holiday.date), 'EEEE, MMMM d')}
            </Text>
            <View style={[styles.typeBadge, getTypeStyle(holiday.type)]}>
              <Text style={styles.typeText}>{holiday.type}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getHolidayIcon, getTypeStyle]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {renderYearSelector()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A1B9A" />
            <Text style={styles.loadingText}>Loading holidays...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchHolidays}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <RefreshWrapper onRefresh={handleRefresh}>
            <View style={styles.contentContainer}>
              <View style={styles.calendarHeader}>
                <FontAwesome5 name="calendar-alt" size={20} color="#6A1B9A" />
                <Text style={styles.calendarHeaderText}>
                  {holidays.length} Holidays in {year}
                </Text>
              </View>
              
              {Object.entries(groupHolidaysByMonth()).map(([month, monthHolidays]) => (
                <View key={month} style={styles.monthSection}>
                  <Text style={styles.monthTitle}>{month}</Text>
                  {monthHolidays.map(holiday => renderHolidayItem(holiday))}
                </View>
              ))}
              
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  * Tap on a holiday to see more details
                </Text>
              </View>
            </View>
          </RefreshWrapper>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginHorizontal: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  monthContainer: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  holidayCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  holidayIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f3f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  holidayContent: {
    flex: 1,
  },
  holidayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  holidayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holidayDate: {
    fontSize: 14,
    color: '#666',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nationalType: {
    backgroundColor: '#ffcdd2',
  },
  religiousType: {
    backgroundColor: '#d1c4e9',
  },
  stateType: {
    backgroundColor: '#bbdefb',
  },
  otherType: {
    backgroundColor: '#b2dfdb',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    marginTop: 16,
    marginBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  contentContainer: {
    flex: 1,
  },
  monthSection: {
    marginBottom: 24,
  },
}); 