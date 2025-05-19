import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  type: 'Rating' | 'Text';
}

interface Question {
  id: string;
  survey_id: string;
  question: string;
  category?: string;
}

interface Response {
  question_id: string;
  response: string | number;
}

export default function SurveyDetailScreen() {
  const { id } = useLocalSearchParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userResponses, setUserResponses] = useState<Record<string, string | number>>({});
  
  // Group questions based on SURVEY type
  const groupedQuestions = useMemo(() => {
    if (!questions || questions.length === 0 || !survey?.type) return [];

    // For both Rating and Text surveys, group all questions by category
    const categoriesMap = new Map<string, Question[]>();
    questions.forEach(q => {
      const categoryKey = q.category || 'Uncategorized';
      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, []);
      }
      categoriesMap.get(categoryKey)!.push(q);
    });
    return Array.from(categoriesMap.values()).filter(group => group.length > 0);
  }, [questions, survey?.type]); // Depend on questions and survey type
  
  // Calculate totalPages and currentQuestions based on the memoized groupedQuestions
  const totalPages = groupedQuestions.length;
  const currentQuestions = useMemo(() => {
      // Ensure currentPage is within valid bounds
      const pageIndex = Math.max(0, Math.min(currentPage, totalPages - 1));
      return groupedQuestions[pageIndex] || [];
  }, [groupedQuestions, currentPage, totalPages]);
  const isLastPage = currentPage >= totalPages - 1;

  // Reset currentPage if questions change and the current page becomes invalid
  useEffect(() => {
      if (currentPage >= totalPages && totalPages > 0) {
          setCurrentPage(totalPages - 1);
      } else if (totalPages === 0 && questions.length > 0) {
          // If totalPages became 0 but we have questions, reset to 0
          // This can happen briefly during loading/type change
          setCurrentPage(0);
      } else if (totalPages > 0 && currentPage < 0) {
           setCurrentPage(0);
      }
  }, [totalPages, currentPage, questions]);

  useEffect(() => {
    loadSurvey();
  }, [id]);

  const sentimentAnalysis = async (response: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("sentiment-analysis", {
        body: 
          { inputs: response }
      });
      
      if (error) throw error;
      console.log("Sentiment result:", data);
      
      return data;
    } catch (err) {
      console.error("Error in sentiment analysis:", err);
      return null;
    }
  }

  async function loadSurvey() {
    setLoading(true); // Ensure loading is true at the start
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load survey details
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData);

      // Check if user has completed this survey
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .select('question_id, response')
        .eq('survey_id', id)
        .eq('user_id', user.id);
        
      if (responseError) throw responseError;
      
      if (responseData && responseData.length > 0) {
        setIsCompleted(true);
        
        // Transform responses into a map for easy lookup
        const responsesMap: Record<string, string | number> = {};
        responseData.forEach(item => {
          responsesMap[item.question_id] = item.response;
        });
        
        setUserResponses(responsesMap);
        
        // Initialize responses with user's previous responses
        setResponses(questionsData.map(q => ({
          question_id: q.id,
          response: responsesMap[q.id] !== undefined ? responsesMap[q.id] : (surveyData.type === 'Rating' ? 0 : '')
        })));
      } else {
        setIsCompleted(false);
        
        // Initialize empty responses
        setResponses(questionsData.map(q => ({
          question_id: q.id,
          response: surveyData.type === 'Rating' ? 0 : ''
        })));
      }
    } catch (error) {
      console.error('Error loading survey:', error);
      Alert.alert('Error', 'Failed to load survey details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function updateResponse(questionId: string, value: string | number) {
    setResponses(prev => 
      prev.map(r => r.question_id === questionId ? { ...r, response: value } : r)
    );
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate *all* responses before submitting
      const allQuestionIds = questions.map(q => q.id);
      const answeredQuestionIds = new Set(responses.map(r => r.question_id));
      
      const hasMissingResponses = allQuestionIds.some(qid => !answeredQuestionIds.has(qid));
      const hasEmptyResponses = responses.some(r => {
        const question = questions.find(q => q.id === r.question_id);
        if (!question) return true; // Should not happen
        if (survey?.type === 'Text') return String(r.response).trim() === '';
        if (survey?.type === 'Rating') return r.response === 0; // Assuming 0 means unanswered
        return true; // Default to invalid for unknown types
      });

      if (hasMissingResponses || hasEmptyResponses) {
        Alert.alert('Error', 'Please answer all questions before submitting.');
        setSubmitting(false); // Reset submitting state
        return;
      }

      // For Text surveys, perform sentiment analysis on each response
      let responseData = [];
      
      if (survey?.type === 'Text') {
        // Process text responses with sentiment analysis
        for (const r of responses) {
          const responseText = String(r.response).trim();
          let sentimentData = null;
          
          if (responseText) {
            sentimentData = await sentimentAnalysis(responseText);

            if (Array.isArray(sentimentData)) {
              // Remove extra words and convert to integer
              sentimentData = sentimentData[0].map((item: { label: string; score: number }) => ({
                label: parseInt(item.label),
                score: item.score
              }));
            }
          }
          
          responseData.push({
            survey_id: id,
            question_id: r.question_id,
            user_id: user.id,
            response: r.response,
            sentiment: sentimentData
          });
        }
      } else {
        responseData = responses.map(r => ({
          survey_id: id,
          question_id: r.question_id,
          user_id: user.id,
          response: r.response
        }));
      }

      // Insert all responses with sentiment data if applicable
      const { error } = await supabase
        .from('survey_responses')
        .insert(responseData);

      if (error) throw error;

      Alert.alert('Success', 'Survey submitted successfully');
      router.back();
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert('Error', 'Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{survey?.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        {survey?.description && (
          <Text style={styles.description}>{survey?.description}</Text>
        )}
        
        {currentQuestions.length > 0 && (
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              {`Category: ${currentQuestions[0].category || 'Uncategorized'}`}
            </Text>
          </View>
        )}

        {currentQuestions.map((question, index) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionText}>
              {(currentPage * 5) + index + 1}. {question.question}
            </Text>

            {survey?.type === 'Rating' && (
              <View style={styles.ratingContainer}>
                {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((option, rating) => {
                  const isSelected = responses.find(r => r.question_id === question.id)?.response === rating + 1;
                  return (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, isSelected && styles.selectedRating]}
                      onPress={() => !isCompleted && updateResponse(question.id, rating + 1)}
                      disabled={isCompleted}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.selectedRadioCircle]} />
                      <Text style={[styles.ratingText, isSelected && styles.selectedRatingText]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {survey?.type === 'Text' && (
              <TextInput
                style={[styles.textInput, isCompleted && styles.readonlyInput]}
                multiline
                numberOfLines={4}
                placeholder="Enter your answer here..."
                placeholderTextColor="#999"
                value={responses.find(r => r.question_id === question.id)?.response as string}
                onChangeText={(text) => updateResponse(question.id, text)}
                editable={!isCompleted && survey?.status !== 'Closed'}
              />
            )}
          </View>
        ))}

        {/* Navigation buttons for pagination */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            onPress={() => setCurrentPage(currentPage - 1)} 
            disabled={currentPage === 0}
            style={[styles.navButton, currentPage === 0 && styles.disabledButton]}
          >
            <FontAwesome name="arrow-left" size={16} color={currentPage === 0 ? "#ccc" : "#333"} />
            <Text style={[styles.navButtonText, currentPage === 0 && styles.disabledText]}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageIndicator}>
            Page {currentPage + 1} of {totalPages}
          </Text>
          
          <TouchableOpacity 
            onPress={() => setCurrentPage(currentPage + 1)} 
            disabled={isLastPage}
            style={[styles.navButton, isLastPage && styles.disabledButton]}
          >
            <Text style={[styles.navButtonText, isLastPage && styles.disabledText]}>Next</Text>
            <FontAwesome name="arrow-right" size={16} color={isLastPage ? "#ccc" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* Submit button only on the last page */}
        {isLastPage && totalPages > 0 && !isCompleted && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  // optionsContainer: {
  //   gap: 8,
  // },
  // optionButton: {
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   borderRadius: 8,
  //   padding: 12,
  // },
  // selectedOption: {
  //   backgroundColor: '#6A1B9A',
  //   borderColor: '#6A1B9A',
  // },
  // optionText: {
  //   fontSize: 14,
  //   color: '#333',
  // },
  // selectedOptionText: {
  //   color: 'white',
  // },
  ratingContainer: {
    marginTop: 12,
    gap: 10,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectedRating: {
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  selectedRatingText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioCircle: {
    borderColor: '#6A1B9A',
    backgroundColor: '#6A1B9A',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 60,
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#6A1B9A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#B39DDB',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  categoryHeader: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#666',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
  },
  navButtonText: {
    marginBottom: 0,
    marginHorizontal: 4,
    fontSize: 14,
    color: '#333',
  },
  disabledText: {
    color: '#ccc',
  },
  readonlyInput: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
    color: '#666',
  },
}); 