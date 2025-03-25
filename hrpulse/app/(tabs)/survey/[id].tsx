import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'rating';
  options: string[] | null;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
}

export default function SurveyResponseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSurveyAndQuestions();
  }, [id]);

  async function loadSurveyAndQuestions() {
    try {
      // Load survey details
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      // Load questions
      const { data: questionData, error: questionError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('created_at', { ascending: true });

      if (questionError) throw questionError;
      setQuestions(questionData || []);

      // Initialize responses
      const initialResponses: Record<string, any> = {};
      questionData?.forEach((q: Question) => {
        initialResponses[q.id] = q.type === 'rating' ? 3 : '';
      });
      setResponses(initialResponses);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Validate responses
      const unansweredQuestions = questions.filter(q => {
        const response = responses[q.id];
        return response === '' || response === undefined;
      });

      if (unansweredQuestions.length > 0) {
        Alert.alert('Error', 'Please answer all questions before submitting');
        return;
      }

      // Submit responses
      const responsesToSubmit = questions.map(question => ({
        survey_id: id,
        question_id: question.id,
        user_id: survey?.is_anonymous ? null : user?.id,
        response: responses[question.id],
      }));

      const { error } = await supabase
        .from('survey_responses')
        .insert(responsesToSubmit);

      if (error) throw error;

      Alert.alert('Success', 'Survey responses submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(question: Question) {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <View style={styles.optionsContainer}>
            {question.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  responses[question.id] === option && styles.optionButtonSelected,
                ]}
                onPress={() => setResponses({ ...responses, [question.id]: option })}>
                <Text
                  style={[
                    styles.optionText,
                    responses[question.id] === option && styles.optionTextSelected,
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={responses[question.id]}
              onValueChange={(value) => setResponses({ ...responses, [question.id]: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#000000"
            />
            <Text style={styles.ratingValue}>{responses[question.id]}/5</Text>
          </View>
        );

      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={responses[question.id]}
            onChangeText={(text) => setResponses({ ...responses, [question.id]: text })}
            placeholder="Enter your response"
            multiline
            numberOfLines={4}
          />
        );
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading survey...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{survey?.title}</Text>
          <Text style={styles.description}>{survey?.description}</Text>
          {survey?.is_anonymous && (
            <View style={styles.anonymousBanner}>
              <Text style={styles.anonymousText}>
                This survey is anonymous. Your responses will not be linked to your identity.
              </Text>
            </View>
          )}
        </View>

        {questions.map((question, index) => (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.question}</Text>
            {renderQuestion(question)}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Responses'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  anonymousBanner: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
  },
  anonymousText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
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
  questionNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    color: '#007AFF',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: 'white',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 