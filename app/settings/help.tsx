import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "How do I check in/out for attendance?",
      answer: "Go to the Home page and tap the CHECK IN button. Make sure you're within work hours (6 AM - 10 PM). For remote employees, location permission is required."
    },
    {
      question: "How do I apply for leave?",
      answer: "Navigate to the Leave section, tap the plus (+) button, fill in the required details including dates, leave type, and reason, then submit your application."
    },
    {
      question: "How can I give recognition to colleagues?",
      answer: "Go to the Recognition section, tap the plus (+) button, select the colleague, choose recognition type and points, write your appreciation message, then submit."
    },
    {
      question: "How do I participate in surveys?",
      answer: "Active surveys appear on your home page and in the Survey section. Tap 'Start Now' to participate. You can save progress and continue later."
    },
    {
      question: "How do I redeem rewards?",
      answer: "Visit the Rewards section, browse available rewards, tap on any reward to see details, then tap 'Redeem' if you have sufficient points."
    },
    {
      question: "How do I view my redemption history?",
      answer: "In the Rewards section, tap on 'Redemptions' tab to view all your past redemptions and their status."
    },
    {
      question: "Why can't I apply for leave?",
      answer: "You may have exhausted your annual leave quota. Check your remaining leave days in the Leave section. Contact HR if you believe this is an error."
    },
    {
      question: "How do I check my attendance history?",
      answer: "Go to the Attendance section to view your complete attendance records, filter by date range, and see detailed check-in/out times."
    }
  ];

  const contactOptions = [
    {
      title: "Email Support",
      description: "Get help via email",
      icon: "mail-outline",
      action: () => Linking.openURL('mailto:hr@company.com?subject=HRPulse Support Request')
    },
    {
      title: "Phone Support",
      description: "Call our support team",
      icon: "call-outline",
      action: () => Linking.openURL('tel:+60123456789')
    },
    {
      title: "HR Department",
      description: "Visit HR office",
      icon: "business-outline",
      action: () => Alert.alert('HR Office', 'Visit HR Department\nOffice Hours: 9:00 AM - 5:00 PM\nLocation: Level 10, HR Office')
    },
    {
      title: "IT Support",
      description: "Technical assistance",
      icon: "desktop-outline",
      action: () => Linking.openURL('mailto:it@company.com?subject=HRPulse Technical Issue')
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.header}
      >
        <Ionicons name="help-circle" size={32} color="white" />
        <Text style={styles.headerTitle}>Help & Support</Text>
        <Text style={styles.headerSubtitle}>We're here to help you</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickHelpGrid}>
            <TouchableOpacity style={styles.quickHelpItem}>
              <Ionicons name="book-outline" size={24} color="#6A1B9A" />
              <Text style={styles.quickHelpText}>User Guide</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickHelpItem}>
              <Ionicons name="videocam-outline" size={24} color="#6A1B9A" />
              <Text style={styles.quickHelpText}>Video Tutorials</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickHelpItem}>
              <Ionicons name="download-outline" size={24} color="#6A1B9A" />
              <Text style={styles.quickHelpText}>Downloads</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickHelpItem}>
              <Ionicons name="chatbubbles-outline" size={24} color="#6A1B9A" />
              <Text style={styles.quickHelpText}>Live Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(index)}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6A1B9A"
                />
              </TouchableOpacity>
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactOption}
              onPress={option.action}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name={option.icon as any} size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* System Information */}
        <View style={[styles.section, { marginBottom: 45 }]}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.systemInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>December 2024</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Support Hours:</Text>
              <Text style={styles.infoValue}>9:00 AM - 5:00 PM</Text>
            </View>
          </View>
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
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#6A1B9A',
    paddingBottom: 8,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickHelpItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickHelpText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingTop: 8,
    paddingLeft: 4,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
  },
  systemInfo: {
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
}); 