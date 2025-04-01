import { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter, Link } from 'expo-router';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  department: string;
  position: string;
  employeeId: string;
  phoneNumber: string;
}

export default function Register() {
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    position: '',
    employeeId: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    // Validate form
    if (!form.email || !form.password || !form.confirmPassword || !form.fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
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
      
      // Create auth user
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: form.fullName,
            department: form.department,
            position: form.position,
            employee_id: form.employeeId,
            phone_number: form.phoneNumber,
          });

        if (profileError) throw profileError;

        Alert.alert(
          'Success',
          'Please check your email for verification link',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join HRPulse Employee Portal</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          value={form.fullName}
          onChangeText={(text) => setForm(prev => ({ ...prev, fullName: text }))}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={form.email}
          onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password *"
          value={form.password}
          onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password *"
          value={form.confirmPassword}
          onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Department"
          value={form.department}
          onChangeText={(text) => setForm(prev => ({ ...prev, department: text }))}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Position"
          value={form.position}
          onChangeText={(text) => setForm(prev => ({ ...prev, position: text }))}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Employee ID"
          value={form.employeeId}
          onChangeText={(text) => setForm(prev => ({ ...prev, employeeId: text }))}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={form.phoneNumber}
          onChangeText={(text) => setForm(prev => ({ ...prev, phoneNumber: text }))}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
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
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
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
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
