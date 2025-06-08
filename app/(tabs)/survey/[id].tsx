import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../supabase';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

interface Survey {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Question {
  id: string;
  survey_id: string;
  question: string;
  category?: string;
  type: 'rating' | 'text';
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
    if (!questions || questions.length === 0) return [];
    const categoriesMap = new Map<string, Question[]>();
    questions.forEach(q => {
      const categoryKey = q.category || 'Uncategorized';
      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, []);
      }
      categoriesMap.get(categoryKey)!.push(q);
    });
    return Array.from(categoriesMap.values()).filter(group => group.length > 0);
  }, [questions]);
  
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
          response: responsesMap[q.id] !== undefined ? responsesMap[q.id] : (q.type === 'rating' ? 0 : '')
        })));
      } else {
        setIsCompleted(false);
        
        // Initialize empty responses
        setResponses(questionsData.map(q => ({
          question_id: q.id,
          response: q.type === 'rating' ? 0 : ''
        })));
      }
    } catch (error) {
      console.error('Error loading survey:', error);
      Alert.alert('Error', 'Failed to load survey details');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  // Text validation helper function
  const validateTextInput = (text: string): boolean => {
    // Check if text contains at least some alphabetic characters
    const alphabeticRegex = /[a-zA-Z]/;
    return alphabeticRegex.test(text.trim());
  };

  function updateResponse(questionId: string, value: string | number) {
    // For text inputs, validate alphabetic content
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue && !validateTextInput(trimmedValue)) {
        Alert.alert('Invalid Input', 'Please do not just provide feedback in numbers');
        return;
      }
    }
    
    setResponses(prev => 
      prev.map(r => r.question_id === questionId ? { ...r, response: value } : r)
    );
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Enhanced validation for rating questions (mandatory) and text questions (optional but must be alphabetic if provided)
      const allQuestionIds = questions.map(q => q.id);
      const answeredQuestionIds = new Set(responses.map(r => r.question_id));
      
      const hasMissingResponses = allQuestionIds.some(qid => !answeredQuestionIds.has(qid));
      const hasInvalidResponses = responses.some(r => {
        const question = questions.find(q => q.id === r.question_id);
        if (!question) return true;
        
        if (question.type === 'rating') {
          // Rating questions are mandatory
          return r.response === 0;
        }
        
        if (question.type === 'text') {
          // Text questions are optional, but if provided, must contain alphabetic characters
          const textResponse = String(r.response).trim();
          if (textResponse) {
            return !validateTextInput(textResponse);
          }
          // Empty text responses are allowed (optional)
          return false;
        }
        
        return true;
      });

      if (hasMissingResponses || hasInvalidResponses) {
        const ratingQuestions = questions.filter(q => q.type === 'rating');
        const unansweredRatings = ratingQuestions.filter(q => {
          const response = responses.find(r => r.question_id === q.id);
          return !response || response.response === 0;
        });

        if (unansweredRatings.length > 0) {
          Alert.alert('Required Fields', 'Please answer all rating questions');
        } else {
          Alert.alert('Invalid Input', 'Please do not just provide feedback in numbers');
        }
        setSubmitting(false);
        return;
      }

      // First, insert all responses without sentiment analysis for immediate feedback
      let responseData = [];
      let textResponses = [];
      
      for (const r of responses) {
        const question = questions.find(q => q.id === r.question_id);
        if (!question) continue;
        
        if (question.type === 'text') {
          const responseText = String(r.response).trim();
          
          // Skip empty text responses - don't save them to database
          if (!responseText) {
            continue;
          }
          
          const responseRecord = {
            survey_id: id,
            question_id: r.question_id,
            user_id: user.id,
            response: r.response,
            sentiment: null // Will be updated later
          };
          
          responseData.push(responseRecord);
          textResponses.push({ ...responseRecord, responseText });
        } else {
          // For rating questions, ensure we have a valid response
          if (r.response && r.response !== 0) {
            responseData.push({
              survey_id: id,
              question_id: r.question_id,
              user_id: user.id,
              response: r.response
            });
          }
        }
      }

      // Insert all responses immediately for fast user feedback
      const { error } = await supabase
        .from('survey_responses')
        .insert(responseData);

      if (error) throw error;

      // Show success message immediately
      Alert.alert('Success', 'Survey submitted successfully');
      router.back();

      // Perform sentiment analysis in the background and update records
      if (textResponses.length > 0) {
        // Don't await this - let it run in background
        Promise.all(
          textResponses.map(async (textResp) => {
            try {
              const sentimentData = await sentimentAnalysis(textResp.responseText);
              
              let processedSentiment = null;
              if (Array.isArray(sentimentData)) {
                processedSentiment = sentimentData[0].map((item: { label: string; score: number }) => ({
                  label: parseInt(item.label),
                  score: item.score
                }));
              }
              
              // Update the record with sentiment data
              await supabase
                .from('survey_responses')
                .update({ sentiment: processedSentiment })
                .eq('survey_id', textResp.survey_id)
                .eq('question_id', textResp.question_id)
                .eq('user_id', textResp.user_id);
            } catch (err) {
              console.error('Background sentiment analysis failed:', err);
              // Fail silently for background processing
            }
          })
        ).catch(err => {
          console.error('Sentiment analysis batch failed:', err);
        });
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert('Error', 'Failed to submit survey. Please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="white" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#f8f9fa', '#ffffff']}
      style={styles.container}
    >
      <LinearGradient
        colors={['#6A1B9A', '#8E24AA']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
    <Text style={styles.title}>{survey?.title}</Text>
  </View>
  <View style={{ width: 20 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Survey Description */}
        {survey?.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{survey?.description}</Text>
          </View>
        )}
        
        {currentQuestions.length > 0 && (
          <LinearGradient
            colors={['#F3E5F5', '#ffffff']}
            style={styles.categoryHeader}
          >
            <Text style={styles.categoryTitle}>
              {`Category: ${currentQuestions[0].category || 'Uncategorized'}`}
            </Text>
          </LinearGradient>
        )}

        {currentQuestions.map((question, index) => (
          <LinearGradient
            key={question.id}
            colors={['#ffffff', '#f8f9fa']}
            style={styles.questionCard}
          >
            <Text style={styles.questionText}>
              {(currentPage * 5) + index + 1}. {question.question}
              {question.type === 'rating' && <Text style={styles.requiredAsterisk}> *</Text>}
            </Text>

            {question.type === 'rating' && (
              <View style={styles.ratingContainer}>
                {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((option, rating) => {
                  const isSelected = responses.find(r => r.question_id === question.id)?.response === rating + 1;
                  return (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingButton, isSelected && styles.selectedRating]}
                      onPress={() => !isCompleted && survey?.status !== 'Closed' && updateResponse(question.id, rating + 1)}
                      disabled={isCompleted || survey?.status === 'Closed'}
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

            {question.type === 'text' && (
              <View>
                <TextInput
                  style={[
                    styles.textInput, 
                    (isCompleted || survey?.status === 'Closed') && styles.readonlyInput
                  ]}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter your answer here (optional)..."
                  placeholderTextColor="#999"
                  value={responses.find(r => r.question_id === question.id)?.response as string}
                  onChangeText={(text) => updateResponse(question.id, text)}
                  editable={!isCompleted && survey?.status !== 'Closed'}
                />
              </View>
            )}
          </LinearGradient>
        ))}

        {/* Navigation buttons for pagination */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            onPress={() => setCurrentPage(currentPage - 1)} 
            disabled={currentPage === 0}
            style={[styles.navButton, currentPage === 0 && styles.disabledButton]}
          >
            <LinearGradient
              colors={currentPage === 0 ? ['#f2f2f2', '#f2f2f2'] : ['#6A1B9A', '#8E24AA']}
              style={styles.navButtonGradient}
            >
              <FontAwesome name="arrow-left" size={14} color={currentPage === 0 ? "#b3b3b3" : "white"} />
              <Text style={[styles.navButtonText, currentPage === 0 && styles.disabledText]}>Back</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <LinearGradient
            colors={['#E8EAF6', '#ffffff']}
            style={styles.pageIndicatorContainer}
          >
            <Text style={styles.pageIndicator}>
              Page {currentPage + 1} of {totalPages}
            </Text>
          </LinearGradient>
          
          <TouchableOpacity 
            onPress={() => setCurrentPage(currentPage + 1)} 
            disabled={isLastPage}
            style={[styles.navButton, isLastPage && styles.disabledButton]}
          >
            <LinearGradient
              colors={isLastPage ? ['#f2f2f2', '#f2f2f2'] : ['#6A1B9A', '#8E24AA']}
              style={styles.navButtonGradient}
            >
              <Text style={[styles.navButtonText, isLastPage && styles.disabledText]}>Next</Text>
              <FontAwesome name="arrow-right" size={14} color={isLastPage ? "#b3b3b3" : "white"} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Submit button only on the last page */}
        {isLastPage && !isCompleted && survey?.status !== 'Closed' && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient
              colors={submitting ? ['#B39DDB', '#B39DDB'] : ['#6A1B9A', '#8E24AA']}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Survey</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Show message if survey is closed */}
        {survey?.status === 'Closed' && (
          <LinearGradient
            colors={['#FFEBEE', '#ffffff']}
            style={styles.closedMessage}
          >
            <Text style={styles.closedMessageText}>
              This survey is no longer accepting responses
            </Text>
          </LinearGradient>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    padding: 16,
    paddingTop: 10,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10, // matches paddingTop
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  descriptionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
    marginTop: -10,
    marginBottom: 10,
  },
  description: {
    fontStyle: 'italic',
    fontSize: 16,
    color: '#333',
  },
  questionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  requiredAsterisk: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionalLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
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
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
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
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pageIndicatorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pageIndicator: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  navButton: {
    borderRadius: 8,
  },
  navButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  navButtonText: {
    marginBottom: 0,
    marginHorizontal: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  disabledText: {
    color: '#b3b3b3',
    fontWeight: '600'
  },
  readonlyInput: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
    color: '#666',
  },
  closedMessage: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  closedMessageText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 