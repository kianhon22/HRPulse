import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay } from 'date-fns';
import { supabase } from '../../supabase';

interface LeaveRecord {
  id: string;
  user_id: string;
  user_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaves: LeaveRecord[];
  holiday?: Holiday;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEAVE_TYPE_COLORS = {
  'Annual': '#FFC107',
  'Medical': '#F44336',
  'Emergency': '#FF5722',
  'Unpaid': '#9E9E9E',
  'Holiday': '#8E24AA',
};

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaves(),
        fetchHolidays(),
        fetchUserNames()
      ]);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('leaves')
        .select('id, user_id, leave_type, start_date, end_date, status')
        .eq('status', 'Approved')
        .or(`start_date.lte.${end.toISOString()},end_date.gte.${start.toISOString()}`);
      
      if (error) throw error;
      
      setLeaves(data ? data.map((leave: any) => ({ ...leave, user_name: userNames[leave.user_id] })) : []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const year = currentMonth.getFullYear();
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
  
      // Filter to current month only
      const month = currentMonth.getMonth() + 1;
      const monthStr = month.toString().padStart(2, '0');
  
      const filteredHolidays = holidaysFromAPI.filter((h: any) =>
        h.date.startsWith(`${year}-${monthStr}`)
      );
  
      setHolidays(filteredHolidays);
    } catch (err) {
      console.error('Error fetching holidays from Calendarific API:', err);
      setHolidays([]);
    }
  };
  
  const mapType = (types: string[]): Holiday['type'] => {
    if (types.includes('National holiday')) return 'National';
    if (types.includes('Religious')) return 'Religious';
    if (types.includes('Local holiday')) return 'State';
    return 'Other';
  };
  
  // const fetchHolidays = async () => {
  //   try {
  //     const year = currentMonth.getFullYear();
  //     const month = currentMonth.getMonth() + 1;
      
  //     // Attempt to fetch from holidays table
  //     const { data, error } = await supabase
  //       .from('holidays')
  //       .select('*')
  //       .eq('year', year)
  //       .ilike('date', `${year}-${month.toString().padStart(2, '0')}%`);
      
  //     if (error) throw error;
      
  //     if (data && data.length > 0) {
  //       setHolidays(data);
  //     } else {
  //       // If no data, use hardcoded holidays for the demo
  //       // In a real app, you'd save this to the database or fetch from an API
  //       const demoHolidays: Holiday[] = getHardcodedHolidays(year, month);
  //       setHolidays(demoHolidays);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching holidays:', error);
  //     // Fallback to hardcoded holidays
  //     const demoHolidays: Holiday[] = getHardcodedHolidays(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  //     setHolidays(demoHolidays);
  //   }
  // };

  // const getHardcodedHolidays = (year: number, month: number): Holiday[] => {
  //   // This is a simple example with Malaysian holidays
  //   // In a real app, this would come from a more complete source
  //   const holidayData: {[key: string]: {name: string, month: number, day: number, type: string}[]} = {
  //     '2023': [
  //       { name: "New Year's Day", month: 1, day: 1, type: 'National' },
  //       { name: "Chinese New Year", month: 1, day: 22, type: 'National' },
  //       { name: "Federal Territory Day", month: 2, day: 1, type: 'State' },
  //       { name: "Thaipusam", month: 2, day: 5, type: 'Religious' },
  //       { name: "Labour Day", month: 5, day: 1, type: 'National' },
  //       { name: "Wesak Day", month: 5, day: 4, type: 'Religious' },
  //       { name: "King's Birthday", month: 6, day: 5, type: 'National' },
  //       { name: "Hari Raya Puasa", month: 4, day: 22, type: 'Religious' },
  //       { name: "National Day", month: 8, day: 31, type: 'National' },
  //       { name: "Malaysia Day", month: 9, day: 16, type: 'National' },
  //       { name: "Deepavali", month: 11, day: 12, type: 'Religious' },
  //       { name: "Christmas", month: 12, day: 25, type: 'Religious' }
  //     ],
  //     '2024': [
  //       { name: "New Year's Day", month: 1, day: 1, type: 'National' },
  //       { name: "Chinese New Year", month: 2, day: 10, type: 'National' },
  //       { name: "Federal Territory Day", month: 2, day: 1, type: 'State' },
  //       { name: "Thaipusam", month: 1, day: 25, type: 'Religious' },
  //       { name: "Labour Day", month: 5, day: 1, type: 'National' },
  //       { name: "Wesak Day", month: 5, day: 22, type: 'Religious' },
  //       { name: "Hari Raya Puasa", month: 4, day: 10, type: 'Religious' },
  //       { name: "King's Birthday", month: 6, day: 3, type: 'National' },
  //       { name: "Hari Raya Haji", month: 6, day: 17, type: 'Religious' },
  //       { name: "National Day", month: 8, day: 31, type: 'National' },
  //       { name: "Malaysia Day", month: 9, day: 16, type: 'National' },
  //       { name: "Deepavali", month: 11, day: 1, type: 'Religious' },
  //       { name: "Christmas", month: 12, day: 25, type: 'Religious' }
  //     ]
  //   };

  //   const yearStr = year.toString();
  //   // Use current year data if available, otherwise fallback to 2024
  //   const yearData = holidayData[yearStr] || holidayData['2024'];
    
  //   return yearData
  //     .filter(h => h.month === month)
  //     .map((h, index) => ({
  //       id: `holiday-${year}-${month}-${h.day}-${index}`,
  //       name: h.name,
  //       date: `${year}-${month.toString().padStart(2, '0')}-${h.day.toString().padStart(2, '0')}`,
  //       type: h.type
  //     }));
  // };

  const fetchUserNames = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name');
      
      if (error) throw error;
      
      const namesMap: {[key: string]: string} = {};
      if (data) {
        data.forEach(user => {
          namesMap[user.id] = user.name || 'Unknown User';
        });
      }
      
      setUserNames(namesMap);
    } catch (error) {
      console.error('Error fetching user names:', error);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;
    
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDay = getDay(monthStart);
    
    // Add days from previous month to fill the first row
    const prevMonthDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      prevMonthDays.push(subMonths(monthStart, 1));
    }
    
    // Add days from next month to fill the last row
    const lastDay = getDay(monthEnd);
    const nextMonthDays = [];
    for (let i = 1; i < 7 - lastDay; i++) {
      nextMonthDays.push(addMonths(monthStart, 1));
    }
    
    const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays];
    
    const today = new Date();
    
    return allDays.map(date => {
      // Find leaves that include this date
      const dayLeaves = leaves.filter(leave => {
        if (!leave.start_date || !leave.end_date) return false;
        try {
          const startDate = parseISO(leave.start_date);
          const endDate = parseISO(leave.end_date);
          const dateWithoutTime = new Date(date);
          dateWithoutTime.setHours(0, 0, 0, 0);
      
          return dateWithoutTime >= startDate && dateWithoutTime <= endDate;
        } catch (e) {
          console.warn('Invalid leave date:', leave);
          return false;
        }
      });
      
      
      // Find holiday on this date
      const holiday = holidays.find(h => {
        const holidayDate = parseISO(h.date);
        return isSameDay(date, holidayDate);
      });    
            
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isSameDay(date, today),
        leaves: dayLeaves,
        holiday
      };
    });
  }, [currentMonth, leaves, holidays]);
  
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDatePress = (day: CalendarDay) => {
    setSelectedDate(day.date);
  };

  const renderDayIndicators = (day: CalendarDay) => {
    // Show holiday first if it exists
    if (day.holiday) {
      return (
        <View style={[styles.indicator, { backgroundColor: LEAVE_TYPE_COLORS['Holiday'] }]}>
          <Text style={styles.indicatorText}>Holiday</Text>
        </View>
      );
    }
    
    // Show leave indicators (max 2)
    const uniqueLeaves = day.leaves.reduce((acc: { [userId: string]: LeaveRecord }, leave) => {
      if (!acc[leave.user_id]) {
        acc[leave.user_id] = leave;
      }
      return acc;
    }, {});
    
    const uniqueLeaveArray = Object.values(uniqueLeaves);
    
    if (uniqueLeaveArray.length === 0) return null;
    
    return (
      <View style={styles.indicatorContainer}>
        {uniqueLeaveArray.slice(0, 2).map((leave, index) => (
          <View 
            key={`${leave.id}-${index}`} 
            style={[
              styles.indicator, 
              { backgroundColor: LEAVE_TYPE_COLORS[leave.leave_type as keyof typeof LEAVE_TYPE_COLORS] || '#9E9E9E' }
            ]}
          >
            <Text style={styles.indicatorText}>
              {userNames[leave.user_id] ? userNames[leave.user_id].split(' ')[0] : 'User'}
            </Text>
          </View>
        ))}
        {uniqueLeaveArray.length > 2 && (
          <View style={styles.moreIndicator}>
            <Text style={styles.moreIndicatorText}>+{uniqueLeaveArray.length - 2}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCalendarGrid = () => {
    return (
      <View style={styles.calendarGrid}>
        {/* Days of week header */}
        <View style={styles.daysOfWeekRow}>
          {DAYS_OF_WEEK.map(day => (
            <View key={day} style={styles.dayOfWeekCell}>
              <Text style={styles.dayOfWeekText}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar days */}
        <View style={styles.daysGrid}>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.calendarRow}>
              {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => (
                <TouchableOpacity
                  key={`day-${rowIndex}-${colIndex}`}
                  style={[
                    styles.calendarCell,
                    !day.isCurrentMonth && styles.outsideMonthCell,
                    day.isToday && styles.todayCell,
                    selectedDate && isSameDay(day.date, selectedDate) && styles.selectedCell,
                    day.holiday && styles.holidayCell
                  ]}
                  onPress={() => handleDatePress(day)}
                >
                  <Text 
                    style={[
                      styles.calendarDayText, 
                      !day.isCurrentMonth && styles.outsideMonthText,
                      day.isToday && styles.todayText,
                      selectedDate && isSameDay(day.date, selectedDate) && styles.selectedText,
                      day.holiday && styles.holidayText
                    ]}
                  >
                    {format(day.date, 'd')}
                  </Text>
                  
                  {renderDayIndicators(day)}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  const renderDetailPanel = () => {
    if (!selectedDate) return null;
    
    const selectedDay = calendarDays.find(day => isSameDay(day.date, selectedDate));
    if (!selectedDay) return null;
    
    return (
      <View style={styles.detailPanel}>
        <Text style={styles.detailDate}>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Text>
        
        {selectedDay.holiday && (
          <View style={styles.holidayDetails}>
            <FontAwesome5 name="calendar-check" size={16} color="#8E24AA" />
            <Text style={styles.holidayDetailText}>
              {selectedDay.holiday.name} ({selectedDay.holiday.type})
            </Text>
          </View>
        )}
        
        {selectedDay.leaves.length > 0 ? (
          <View style={styles.leaveList}>
            <Text style={styles.leaveListTitle}>
              Team Members on Leave:
            </Text>
            {Object.values(
              selectedDay.leaves.reduce((acc: { [userId: string]: LeaveRecord }, leave) => {
                if (!acc[leave.user_id]) {
                  acc[leave.user_id] = leave;
                }
                return acc;
              }, {})
            ).map(leave => (
              <View key={leave.id} style={styles.leaveItem}>
                <View 
                  style={[
                    styles.leaveTypeIndicator, 
                    { backgroundColor: LEAVE_TYPE_COLORS[leave.leave_type as keyof typeof LEAVE_TYPE_COLORS] || '#9E9E9E' }
                  ]} 
                />
                <Text style={styles.leaveName}>
                  {userNames[leave.user_id] || 'Unknown User'}
                </Text>
                <Text style={styles.leaveType}>
                  {leave.leave_type}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          !selectedDay.holiday && (
            <View style={styles.noLeavesContainer}>
              <FontAwesome5 name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.noLeavesText}>
                No team members on leave today
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <Text style={styles.monthYearText}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          
          <View style={styles.calendarControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={goToPreviousMonth}
            >
              <FontAwesome5 name="chevron-left" size={16} color="#6A1B9A" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.todayButton]}
              onPress={goToToday}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={goToNextMonth}
            >
              <FontAwesome5 name="chevron-right" size={16} color="#6A1B9A" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          {Object.entries({...LEAVE_TYPE_COLORS, 'Holiday': '#8E24AA'}).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{type}</Text>
            </View>
          ))}
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A1B9A" />
            <Text style={styles.loadingText}>Loading calendar...</Text>
          </View>
        ) : (
          <ScrollView>
            {renderCalendarGrid()}
            {renderDetailPanel()}
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  todayButton: {
    paddingHorizontal: 12,
    width: 'auto',
    borderRadius: 18,
  },
  todayButtonText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  calendarGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    backgroundColor: '#f5f5f5',
  },
  dayOfWeekCell: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  daysGrid: {
    paddingVertical: 4,
  },
  calendarRow: {
    flexDirection: 'row',
    height: 90,
  },
  calendarCell: {
    flex: 1,
    padding: 4,
    borderRadius: 4,
    margin: 1,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  outsideMonthCell: {
    opacity: 0.4,
  },
  outsideMonthText: {
    color: '#999',
  },
  todayCell: {
    backgroundColor: '#f0e6f5',
  },
  todayText: {
    color: '#6A1B9A',
    fontWeight: 'bold',
  },
  selectedCell: {
    backgroundColor: '#e1bee7',
  },
  selectedText: {
    color: '#4a148c',
    fontWeight: 'bold',
  },
  holidayCell: {
    backgroundColor: '#f8e7ff',
  },
  holidayText: {
    color: '#8E24AA',
    fontWeight: 'bold',
  },
  indicatorContainer: {
    marginTop: 2,
  },
  indicator: {
    padding: 2,
    borderRadius: 4,
    marginBottom: 2,
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  moreIndicator: {
    alignItems: 'center',
  },
  moreIndicatorText: {
    fontSize: 10,
    color: '#666',
  },
  detailPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  holidayDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  holidayDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E24AA',
    marginLeft: 8,
  },
  leaveList: {
    marginTop: 8,
  },
  leaveListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  leaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  leaveTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  leaveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  leaveType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  noLeavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  noLeavesText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
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