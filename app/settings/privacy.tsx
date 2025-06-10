import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.header}
      >
        <Ionicons name="lock-closed" size={32} color="white" />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>Your data protection matters to us</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <Text style={styles.sectionText}>
            HRPulse collects personal information necessary for HR operations including:
            {'\n\n'}• Employee identification and contact details
            {'\n'}• Attendance records and work schedules
            {'\n'}• Leave applications and approval records
            {'\n'}• Performance reviews and recognition data
            {'\n'}• Survey responses and feedback
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Usage</Text>
          <Text style={styles.sectionText}>
            Your data is used exclusively for:
            {'\n\n'}• Managing employee records and HR processes
            {'\n'}• Tracking attendance and leave management
            {'\n'}• Performance evaluation and recognition programs
            {'\n'}• Internal communication and announcements
            {'\n'}• Generating reports for management purposes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection</Text>
          <Text style={styles.sectionText}>
            We implement industry-standard security measures:
            {'\n\n'}• Encrypted data transmission and storage
            {'\n'}• Role-based access controls
            {'\n'}• Regular security audits and updates
            {'\n'}• Secure cloud infrastructure
            {'\n'}• Employee training on data handling
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionText}>
            Your personal data is never sold or shared with third parties except:
            {'\n\n'}• When required by law or legal process
            {'\n'}• With your explicit consent
            {'\n'}• For essential business operations (payroll, benefits)
            {'\n'}• With authorized HR personnel only
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to:
            {'\n\n'}• Access your personal data
            {'\n'}• Request corrections to inaccurate information
            {'\n'}• Request data portability
            {'\n'}• Lodge complaints with supervisory authorities
            {'\n'}• Receive clear information about data processing
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your data for as long as necessary to:
            {'\n\n'}• Fulfill employment obligations
            {'\n'}• Comply with legal requirements
            {'\n'}• Resolve disputes and enforce agreements
            {'\n'}• Support business operations
            {'\n\n'}Data is securely deleted when no longer needed.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For questions about this privacy policy, please contact your HR department.
          </Text>
          <Text style={styles.lastUpdated}>
            Last updated: June 2025
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#6A1B9A',
    paddingBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  footer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
}); 