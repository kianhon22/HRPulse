// hrpulse/app/home.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import HomeHeader from '../../components/HomeHeader';

export default function Home() {
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check in</Text>
              <Text style={styles.cardValue}>08:30</Text>
              <Text style={styles.cardSubtitle}>On time</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check out</Text>
              <Text style={styles.cardValue}>16:30</Text>
              <Text style={styles.cardSubtitle}>Go home</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Points</Text>
              <Text style={styles.cardValue}>2,000</Text>
              <Text style={styles.cardSubtitle}>to be redeemed</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Leaves</Text>
              <Text style={styles.cardValue}>17</Text>
              <Text style={styles.cardSubtitle}>remaining days</Text>
            </View>

            {/* Analytics Section */}
            <View style={styles.analytics}>
              <Text style={styles.analyticsTitle}>Analytics</Text>
              {/* Placeholder for chart */}
              <View style={styles.chartPlaceholder}>
                <Text>Worktime Chart</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6A1B9A', // Purple color
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  analytics: {
    marginTop: 20,
    marginBottom: 20,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
});