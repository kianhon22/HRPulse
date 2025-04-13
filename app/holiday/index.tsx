import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchHolidaysFromAPI();      
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidaysFromAPI = async () => {
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
  };
  
  const mapType = (types: string[]): Holiday['type'] => {
    if (types.includes('National holiday')) return 'National';
    if (types.includes('Religious')) return 'Religious';
    if (types.includes('Local holiday')) return 'State';
    return 'Other';
  };
  
  // const fetchHolidaysFromAPI = async () => {
  //   try {
  //     const staticHolidays: Holiday[] = [
  //       {
  //         id: '1',
  //         name: 'New Year\'s Day',
  //         date: `${year}-01-01`,
  //         type: 'National',
  //         description: 'The first day of the year in the Gregorian calendar.'
  //       },
  //       {
  //         id: '2',
  //         name: 'Chinese New Year',
  //         date: `${year}-02-10`,
  //         type: 'National',
  //         description: 'Chinese Lunar New Year celebration.'
  //       },
  //       {
  //         id: '3',
  //         name: 'Federal Territory Day',
  //         date: `${year}-02-01`,
  //         type: 'State',
  //         description: 'Celebration for the establishment of the Federal Territories.'
  //       },
  //       {
  //         id: '4',
  //         name: 'Thaipusam',
  //         date: `${year}-01-25`,
  //         type: 'Religious',
  //         description: 'Hindu festival celebrated during the full moon in the Tamil month of Thai.'
  //       },
  //       {
  //         id: '5',
  //         name: 'Labour Day',
  //         date: `${year}-05-01`,
  //         type: 'National',
  //         description: 'International celebration of the achievements of workers.'
  //       },
  //       {
  //         id: '6',
  //         name: 'Wesak Day',
  //         date: `${year}-05-22`,
  //         type: 'Religious',
  //         description: 'Buddhist festival that commemorates the birth, enlightenment, and death of Gautama Buddha.'
  //       },
  //       {
  //         id: '7',
  //         name: 'Hari Raya Puasa',
  //         date: `${year}-04-10`,
  //         type: 'Religious',
  //         description: 'Muslim festival marking the end of Ramadan.'
  //       },
  //       {
  //         id: '8',
  //         name: 'Agong\'s Birthday',
  //         date: `${year}-06-03`,
  //         type: 'National',
  //         description: 'Official birthday celebration of the Yang di-Pertuan Agong of Malaysia.'
  //       },
  //       {
  //         id: '9',
  //         name: 'Hari Raya Haji',
  //         date: `${year}-06-17`,
  //         type: 'Religious',
  //         description: 'Islamic festival of sacrifice.'
  //       },
  //       {
  //         id: '10',
  //         name: 'National Day',
  //         date: `${year}-08-31`,
  //         type: 'National',
  //         description: 'Celebration of Malaysia\'s independence from British rule in 1957.'
  //       },
  //       {
  //         id: '11',
  //         name: 'Malaysia Day',
  //         date: `${year}-09-16`,
  //         type: 'National',
  //         description: 'Commemorates the formation of Malaysia in 1963.'
  //       },
  //       {
  //         id: '12',
  //         name: 'Deepavali',
  //         date: `${year}-11-01`,
  //         type: 'Religious',
  //         description: 'Hindu festival of lights.'
  //       },
  //       {
  //         id: '13',
  //         name: 'Christmas',
  //         date: `${year}-12-25`,
  //         type: 'Religious',
  //         description: 'Christian celebration of the birth of Jesus Christ.'
  //       }
  //     ];
      
  //     setHolidays(staticHolidays);
      
  //     // In a real app, you would save this to the database for future use
  //     // await supabase.from('holidays').insert(staticHolidays);
  //   } catch (err) {
  //     console.error('Error fetching holidays from API:', err);
  //     setError('Unable to load holidays. Please try again later.');
  //   }
  // };

  const getHolidayIcon = (type: string) => {
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
  };

  const renderYearSelector = () => {
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
  };

  const groupHolidaysByMonth = () => {
    const grouped: { [key: string]: Holiday[] } = {};
    
    holidays.forEach(holiday => {
      const monthYear = format(parseISO(holiday.date), 'MMMM');
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(holiday);
    });
    
    return grouped;
  };

  const renderHolidayItem = (holiday: Holiday) => {
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
  };

  const getTypeStyle = (type: string) => {
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Year Selector */}
        {renderYearSelector()}
        
        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A1B9A" />
            <Text style={styles.loadingText}>Loading holidays...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchHolidays}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.calendarHeader}>
              <FontAwesome5 name="calendar-alt" size={20} color="#6A1B9A" />
              <Text style={styles.calendarHeaderText}>
                {holidays.length} Holidays in {year}
              </Text>
            </View>
            
            {Object.entries(groupHolidaysByMonth()).map(([month, monthHolidays]) => (
              <View key={month} style={styles.monthContainer}>
                <Text style={styles.monthTitle}>{month}</Text>
                {monthHolidays.map(holiday => renderHolidayItem(holiday))}
              </View>
            ))}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                * Tap on a holiday to see more details
              </Text>
            </View>
          </ScrollView>
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
}); 