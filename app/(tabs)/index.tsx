// hrpulse/app/home.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Image, Dimensions, FlatList } from 'react-native';
import { supabase } from '../../supabase';
import HomeHeader from '../../components/HomeHeader';
import * as Location from 'expo-location';
import { getUserData } from '../../hooks/getUserData';
import { formatTotalHours } from '../../utils/formatText';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { differenceInMinutes, differenceInYears } from 'date-fns';

interface AttendanceRecord {
  id?: string;
  user_id: string;
  check_in?: string;
  check_out?: string;
  total_hours?: number;
}

interface User {
  id: string;
  username?: string;
  email?: string;
  points?: number;
  leave?: number;
  join_company_date?: string;
  left_company_date?: string | null;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_completed: boolean;
}

interface Announcement {
  id: string;
  description: string;
  created_at: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  url?: string;
}

function calculateAnnualLeaves(serviceYears: number): number {
  if (serviceYears < 2) return 8;
  if (serviceYears >= 2 && serviceYears <= 5) return 12;
  return 16;
}

// async function calculateRemainingLeaves(userId: string, joinDate?: string, leftDate?: string | null): Promise<number> {
//   if (!joinDate) return 0;
  
//   const serviceYears = calculateServiceYears(joinDate, leftDate);
//   const annualLeaves = calculateAnnualLeaves(serviceYears);
  
//   // Get A leaves for current year
//   const currentYear = new Date().getFullYear();
//   const startOfYear = `${currentYear}-01-01`;
//   const endOfYear = `${currentYear}-12-31`;

//   try {
//     const { data: leavesData, error } = await supabase
//       .from('leaves')
//       .select('period')
//       .eq('user_id', userId)
//       .eq('status', 'Approved')
//       .gte('start_date', startOfYear)
//       .lte('end_date', endOfYear);

//     if (error) throw error;

//     const usedLeaves = leavesData?.reduce((total, leave) => total + (leave.period || 0), 0) || 0;
//     return annualLeaves - usedLeaves;
//   } catch (error) {
//     console.error('Error calculating remaining leaves:', error);
//     return annualLeaves;
//   }
// }

// Calculate total hours worked for the day
const calculateTotalHours = (checkIn?: string, checkOut?: string): string => {
  if (!checkIn || !checkOut) return '0h 0m';
  
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = differenceInMinutes(end, start);
  
  if (isNaN(diff) || diff < 0) return '0h 0m';
  
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  return `${hours}h ${minutes}m`;
};

// Calculate service years based on join date and leave date
const calculateServiceYears = (joinDate?: string, leaveDate?: string | null): number => {
  if (!joinDate) return 0;
  
  const start = new Date(joinDate);
  const end = leaveDate ? new Date(leaveDate) : new Date();
  
  if (isNaN(start.getTime())) return 0;
  
  const diffYears = differenceInYears(end, start);
  return diffYears;
};

export default function Home() {
  const { userData, loading: userLoading } = getUserData();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingLeaves, setRemainingLeaves] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const carouselRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  const calculateRemainingLeaves = async () => {
    if (userData?.leave) {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('period')
          .eq('user_id', userData.id)
          .eq('status', 'Approved')
          .gte('start_date', startOfYear)
          .lte('end_date', endOfYear);

        if (error) throw error;

        const usedLeaves = data?.reduce((total, leave) => total + (leave.period || 0), 0) || 0;
        setRemainingLeaves(userData.leave - usedLeaves);

      } catch (error) {
        console.error('Error calculating remaining leaves:', error);
        setRemainingLeaves(userData.leave);
      }
    }
  };

  useEffect(() => {
    loadTodayAttendance();
    calculateRemainingLeaves();
    loadAnnouncements();
    loadActiveSurvey();
    loadArticles();
  }, [userData]);

  async function loadTodayAttendance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', today)
        .lte('check_in', today + 'T23:59:59')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayRecord(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  async function loadActiveSurvey() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      
      // Get active surveys
      const { data: activeSurveys, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false })
        .limit(1);

      if (surveyError) throw surveyError;
      
      if (activeSurveys && activeSurveys.length > 0) {
        // Check if user has completed this survey
        const { data: responseData, error: responseError } = await supabase
          .from('survey_responses')
          .select('survey_id')
          .eq('survey_id', activeSurveys[0].id)
          .eq('user_id', user.id);
          
        if (responseError) throw responseError;
        
        // Set the active survey with completion status
        setActiveSurvey({
          ...activeSurveys[0],
          is_completed: responseData && responseData.length > 0
        });
      }
    } catch (error) {
      console.error('Error loading active survey:', error);
    }
  }

  async function loadArticles() {
    try {
      // In a real app, this would come from your database
      // For now, we'll use dummy data
      const dummyArticles: Article[] = [
        {
          id: '1',
          title: 'Improving Work-Life Balance',
          description: 'Discover effective strategies to maintain a healthy work-life balance in today\'s fast-paced work environment.',
          imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
        },
        {
          id: '2',
          title: 'Mindfulness at Work',
          description: 'Learn how practicing mindfulness can increase your productivity and reduce stress throughout your workday.',
          imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
        },
        {
          id: '3',
          title: 'Building Team Collaboration',
          description: 'Explore ways to enhance team collaboration and communication in remote and hybrid work environments.',
          imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
        },
      ];
      
      setArticles(dummyArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  function isWithinWorkHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 6 && hour <= 22;
  }

  async function handleCheckIn() {
    if (!isWithinWorkHours()) {
      Alert.alert('Outside Work Hours', 'Check-in is only available between 6 AM and 10 PM');
      return;
    }

    try {
      setLoading(true);
      let locationName = null;


      if (userData?.work_mode == 'Remote') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for remote employee');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        
        // Perform reverse geocoding to get location name
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        // Build a meaningful location name from the geocoding results
        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          locationName = [
            address.name,
            address.street,
            address.district,
            address.city,
            address.region,
          ].filter(Boolean).join(", ");
        }
      }

      const { error } = await supabase
        .from('attendances')
        .insert([{
          user_id: userData?.id,
          check_in: new Date().toISOString(),
          location: locationName
        }]);

      if (error) throw error;
      loadTodayAttendance();
      Alert.alert('Success', 'Checked in successfully');
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!isWithinWorkHours()) {
      Alert.alert('Outside Work Hours', 'Check-out is only available between 7 AM and 10 PM');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const checkInTime = new Date(todayRecord!.check_in || '');
      const totalHours = ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      const { error } = await supabase
        .from('attendances')
        .update({
          check_out: now.toISOString(),
          total_hours: parseFloat(totalHours.toFixed(2))
        })
        .eq('id', todayRecord!.id);

      if (error) throw error;
      loadTodayAttendance();
      Alert.alert('Success', 'Checked out successfully');
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', 'Failed to check out');
    } finally {
      setLoading(false);
    }
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  function handleCarouselScroll(event: any) {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (screenWidth - 60));
    setActiveIndex(index);
  }

  function renderArticleItem({ item }: { item: Article }) {
    return (
      <TouchableOpacity style={styles.articleItem} onPress={() => item.url && router.push(item.url as any)}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.articleImage} 
          resizeMode="cover"
        />
        <View style={styles.articleContent}>
          <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.articleDescription} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.readMoreText}>Read More</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderDotIndicator() {
    return (
      <View style={styles.dotsContainer}>
        {articles.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              index === activeIndex ? styles.activeDot : {}
            ]} 
          />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <HomeHeader />

          <View style={styles.content}>
            {/* Attendance Card - Modern Design */}
            <View style={styles.attendanceCardContainer}>
              <View style={styles.attendanceHeader}>
                {/* <Text style={styles.attendanceTitle}>Today's Attendance</Text> */}
                {/* <View style={styles.attendanceStatus}>
                  <View style={[styles.statusDot, todayRecord?.check_out ? styles.statusCompleted : todayRecord ? styles.statusActive : '']} />
                  <Text style={styles.statusText}>
                    {todayRecord?.check_out ? 'Completed' : todayRecord ? 'Checked In' : ''}
                  </Text>
                </View> */}
              </View>

              <View style={styles.attendanceContentContainer}>
                <View style={styles.attendanceLeftSection}>
                  {todayRecord ? (
                    <View style={styles.attendanceDetails}>
                      <View style={styles.timeBlock}>
                        <Ionicons name="time-outline" size={30} color="#6A1B9A" />
                        <View style={styles.timeInfo}>
                          <Text style={styles.timeLabel}>Checked In</Text>
                          <Text style={styles.timeValue}>{formatTime(todayRecord.check_in || '')}</Text>
                        </View>
                      </View>

                      {todayRecord.check_out && (
                        <>
                          <View style={styles.timeBlock}>
                            <Ionicons name="time-outline" size={30} color="#6A1B9A" />
                            <View style={styles.timeInfo}>
                              <Text style={styles.timeLabel}>Checked Out</Text>
                              <Text style={styles.timeValue}>{formatTime(todayRecord.check_out)}</Text>
                            </View>
                          </View>
                          {/* <View style={styles.totalHoursContainer}>
                            <Text style={styles.totalHoursLabel}>Total Hours</Text>
                            <Text style={styles.totalHoursValue}>{calculateTotalHours(todayRecord.check_in, todayRecord.check_out)}</Text>
                          </View> */}
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={styles.attendancePrompt}>
                      <Text style={styles.promptText}>Check In Now</Text>
                      <Text style={styles.promptText}>To Start Your Day</Text>
                    </View>
                  )}
                </View>

                <View style={styles.attendanceRightSection}>
                  <TouchableOpacity
                    style={[
                      styles.attendanceButtonLarge,
                      !todayRecord ? styles.checkInButton : 
                      !todayRecord.check_out ? styles.checkOutButton : styles.completedButton,
                      loading && styles.buttonDisabled
                    ]}
                    onPress={!todayRecord ? handleCheckIn : 
                      !todayRecord.check_out ? handleCheckOut : undefined}
                    disabled={loading || !!todayRecord?.check_out}
                  >
                    <Ionicons 
                      name={!todayRecord ? "log-in-outline" : 
                        !todayRecord.check_out ? "log-out-outline" : "bag-check-outline"} 
                      size={50} 
                      color="white" 
                    />
                    <Text style={styles.attendanceButtonText}>
                      {!todayRecord ? 'CHECK IN' : 
                        !todayRecord.check_out ? 'CHECK OUT' : 'COMPLETED'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Info Cards Row */}
            <View style={styles.infoCardsRow}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="award" size={20} color="#6A1B9A" />
                </View>
                <Text style={styles.infoValue}>{userData?.points || 0}</Text>
                <Text style={styles.infoLabel}>Total Points</Text>
                <Text style={styles.infoSubtext}>
                  To be redeemed
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="calendar-alt" size={20} color="#6A1B9A" />
                </View>
                <Text style={styles.infoValue}>{remainingLeaves}</Text>
                <Text style={styles.infoLabel}>Remaining Leave</Text>
                <Text style={styles.infoSubtext}>
                  {calculateServiceYears(userData?.join_company_date || '', userData?.left_company_date) + ' year service'}
                </Text>
              </View>
            </View>
            
            {/* Active Survey Section */}
            {activeSurvey && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Survey</Text>
                  <FontAwesome5 name="poll-h" size={16} color="#6A1B9A" />
                </View>

                <View style={styles.surveyCard}>
                  <Text style={styles.surveyTitle}>{activeSurvey.title}</Text>
                  {activeSurvey?.description && (
                    <Text style={styles.surveyDescription} numberOfLines={2}>{activeSurvey.description}</Text>
                  )}
                  
                  <View style={styles.surveyFooter}>
                    <View style={styles.surveyDates}>
                      <Text style={styles.surveyDateText}>
                        {format(new Date(activeSurvey.start_date), 'MMM dd')} - {format(new Date(activeSurvey.end_date), 'MMM dd, yyyy')}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.surveyButton]} 
                      onPress={() => router.push(`/survey/${activeSurvey.id}`)}
                    >
                      <Text style={styles.surveyButtonText}>
                        {activeSurvey.is_completed ? 'View' : 'Start Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Announcements Section */}
            <View style={[styles.sectionContainer, { paddingBottom: 5 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Announcements</Text>
                <FontAwesome5 name="bullhorn" size={16} color="#6A1B9A" />
              </View>

              {announcements.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No announcements at the moment</Text>
                </View>
              ) : (
                <View style={styles.announcementsList}>
                  {announcements.map((announcement) => (
                    <View key={announcement.id} style={styles.announcementItem}>
                      <View style={styles.announcementDot} />
                      <View style={styles.announcementContent}>
                        <Text style={styles.announcementText}>{announcement.description}</Text>
                        <Text style={styles.announcementDate}>
                          {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Analytics Container (commented out in the original code) */}
            
            {/* Articles Carousel */}
            {articles.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Articles For You</Text>
                  <FontAwesome5 name="book-reader" size={16} color="#6A1B9A" />
                </View>
                
                <View style={styles.carouselContainer}>
                  <FlatList
                    ref={carouselRef}
                    data={articles}
                    renderItem={renderArticleItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    snapToInterval={screenWidth - 60}
                    decelerationRate="fast"
                    onScroll={handleCarouselScroll}
                    contentContainerStyle={styles.carouselList}
                  />
                  {renderDotIndicator()}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  // Attendance Card Styles
  attendanceCardContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceContentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  attendanceLeftSection: {
    flex: 2,
    justifyContent: 'center',
  },
  attendanceRightSection: {
    flex: 1,
    marginLeft: 10,
    marginRight: 20,
    justifyContent: 'center',
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusPending: {
    backgroundColor: '#FFC107',
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusCompleted: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  attendanceDetails: {
    marginBottom: 16,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeInfo: {
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 13,
    color: '#666',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalHoursContainer: {
    backgroundColor: '#f1f3f9',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  totalHoursLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  totalHoursValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  attendancePrompt: {
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  promptText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  attendanceButtonLarge: {
    // height: '100%',
    width: 120,
    height: 100,
    marginLeft: -20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkOutButton: {
    backgroundColor: '#FF9800',
  },
  completedButton: {
    backgroundColor: '#6A1B9A',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  attendanceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  
  // Announcements Styles
  announcementsList: {
    marginTop: 8,
  },
  announcementItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  announcementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6A1B9A',
    marginTop: 6,
    marginRight: 12,
  },
  announcementContent: {
    flex: 1,
  },
  announcementText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: '#888',
  },
  emptySection: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  
  // Survey Card Styles
  surveyCard: {
    marginTop: 6,
  },
  surveyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  surveyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  surveyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  surveyDates: {
    flex: 1,
  },
  surveyDateText: {
    fontSize: 16,
    color: '#888',
  },
  surveyButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  surveyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Info Cards Styles
  infoCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 4,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoSubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic'
  },
  analyticsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  chartPlaceholder: {
    height: 160,
    backgroundColor: '#f1f3f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  // Articles Carousel Styles
  carouselContainer: {
    marginTop: 10,
  },
  carouselList: {
    paddingRight: 20,
  },
  articleItem: {
    width: Dimensions.get('window').width - 80,
    backgroundColor: '#fff',
    marginLeft: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleImage: {
    width: '100%',
    height: 160,
  },
  articleContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6A1B9A',
    width: 12,
    height: 8,
  },
});