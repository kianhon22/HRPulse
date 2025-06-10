import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const features = [
    { icon: 'time-outline', title: 'Attendance Tracking', description: 'Check-in/out with location verification' },
    { icon: 'calendar-outline', title: 'Leave Management', description: 'Apply and track leave applications' },
    { icon: 'trophy-outline', title: 'Recognition System', description: 'Give and receive peer recognition' },
    { icon: 'list-outline', title: 'Surveys & Feedback', description: 'Participate in company surveys' },
    { icon: 'gift-outline', title: 'Rewards Catalog', description: 'Redeem points for exciting rewards' },
    { icon: 'notifications-outline', title: 'Real-time Updates', description: 'Stay informed with push notifications' },
  ];

  const teamMembers = [
    { name: 'Development Team', role: 'App Development & Maintenance' },
    { name: 'HR Department', role: 'Business Requirements & Testing' },
    { name: 'IT Support', role: 'Infrastructure & Security' },
    { name: 'UX Design Team', role: 'User Experience Design' },
  ];

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.header}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="briefcase" size={40} color="white" />
          </View>
          <Text style={styles.appName}>HRPulse</Text>
          <Text style={styles.tagline}>Your Complete HR Solution</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About HRPulse</Text>
          <Text style={styles.description}>
            HRPulse is a comprehensive Human Resources management application designed to streamline 
            HR processes and enhance employee experience. From attendance tracking to recognition 
            programs, HRPulse empowers both employees and HR teams with modern, efficient tools.
          </Text>
          
          <View style={styles.versionInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build:</Text>
              <Text style={styles.infoValue}>2024.12.001</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform:</Text>
              <Text style={styles.infoValue}>React Native</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>December 2024</Text>
            </View>
          </View>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color="#6A1B9A" />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Technology Stack */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technology Stack</Text>
          <View style={styles.techStack}>
            <View style={styles.techItem}>
              <Text style={styles.techName}>React Native</Text>
              <Text style={styles.techDescription}>Cross-platform mobile development</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>Expo</Text>
              <Text style={styles.techDescription}>Development platform and tools</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>Supabase</Text>
              <Text style={styles.techDescription}>Backend-as-a-Service platform</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>TypeScript</Text>
              <Text style={styles.techDescription}>Type-safe JavaScript development</Text>
            </View>
          </View>
        </View>

        {/* Development Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development Team</Text>
          {teamMembers.map((member, index) => (
            <View key={index} style={styles.teamMember}>
              <View style={styles.memberIcon}>
                <Ionicons name="person" size={20} color="#6A1B9A" />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Your Company Name</Text>
            <Text style={styles.companyDescription}>
              Empowering employees through innovative HR technology solutions.
            </Text>
            
            <View style={styles.contactLinks}>
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => openLink('https://company.com')}
              >
                <Ionicons name="globe-outline" size={20} color="#6A1B9A" />
                <Text style={styles.linkText}>Visit Website</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => openLink('mailto:hr@company.com')}
              >
                <Ionicons name="mail-outline" size={20} color="#6A1B9A" />
                <Text style={styles.linkText}>Contact HR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Legal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Information</Text>
          <Text style={styles.legalText}>
            © 2024 Your Company Name. All rights reserved.
            {'\n\n'}This application is for internal use by company employees only. 
            Unauthorized access or distribution is prohibited.
            {'\n\n'}For terms of service and privacy policy, please contact your HR department.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ by our amazing team
          </Text>
          <Text style={styles.copyright}>
            HRPulse v1.0.0 - December 2024
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
    padding: 15,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -15,
    marginBottom: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#6A1B9A',
    paddingBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  versionInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  featuresGrid: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  techStack: {
    marginTop: 8,
  },
  techItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  techName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  techDescription: {
    fontSize: 14,
    color: '#666',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  companyInfo: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  companyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  linkText: {
    fontSize: 14,
    color: '#6A1B9A',
    marginLeft: 8,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 45,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    paddingBottom: 5,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
}); 