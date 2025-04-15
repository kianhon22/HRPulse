import { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../supabase';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPassword() {
  const [form, setForm] = useState<ResetPasswordForm>({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Try to get email from search params or user session
  useEffect(() => {
    const getUser = async () => {
      // Check if we have the token and type in URL params (from email link)
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;
      
      // Try to exchange tokens if available from the deep link
      if (accessToken && typeof accessToken === 'string') {
        try {
          const { data, error } = await supabase.auth.getUser(accessToken);
          if (error) throw error;
          if (data?.user) {
            setEmail(data.user.email || null);
          }
        } catch (error: any) {
          console.error('Error getting user:', error.message);
        }
      } 
      // Try to use refresh token if available
      else if (refreshToken && typeof refreshToken === 'string') {
        try {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (data.user) {
            setEmail(data.user.email || null);
          }
        } catch (error: any) {
          console.error('Error refreshing session:', error.message);
        }
      } 
      // Fallback: check if we have a current session
      else {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            setEmail(session.user.email);
          }
        } catch (error: any) {
          console.error('Error getting session:', error.message);
        }
      }
    };

    getUser();
  }, [params]);

  async function handleResetPassword() {
    if (!form.password || !form.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: form.password
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your password has been updated successfully.',
        [{ text: 'Sign In', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  // Render a message if no user is found or no valid reset token
  if (!email && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <Image 
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Invalid or expired reset link</Text>
          
          <Text style={styles.messageText}>
            The password reset link you used is invalid or has expired. Please request a new password reset link.
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.formContainer}>
            <Image 
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Create a new password</Text>
            
            {email && (
              <View style={styles.emailContainer}>
                <Text style={styles.emailLabel}>Email:</Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>
            )}
            
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={form.password}
              onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Back to Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#6A1B9A',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  emailContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  emailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#6A1B9A',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#6A1B9A',
    fontSize: 16,
    fontWeight: '600',
  },
}); 