import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { formatDate } from '../../utils/formatText';
import { router } from 'expo-router';
import { getUserData, UserData } from '../../hooks/getUserData';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  employment_type?: string;
  work_mode?: string;
  join_company_date?: string;
  image_url?: string | null;
}

export default function ProfileScreen() {
  const { userData, loading: userDataLoading } = getUserData();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userData) {
      // Set profile from userData
      setProfile(userData as unknown as UserProfile);
      setEditedProfile(userData as unknown as Partial<UserProfile>);
    }
  }, [userData]);

  const handleSave = async () => {
    try {
      if (!userData?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update(editedProfile)
        .eq('id', userData.id);

      if (error) throw error;

      setProfile({ ...profile, ...editedProfile } as UserProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64Image = result.assets[0].base64;
        if (!base64Image) {
          throw new Error('No base64 image data found');
        }
        
        await uploadImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      setUploading(true);
      
      if (!userData?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const fileName = `${userData.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('profiles')
        .upload(fileName, decode(base64Image), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase
        .storage
        .from('profiles')
        .getPublicUrl(fileName);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ image_url: publicUrl })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile({ ...profile, image_url: publicUrl } as UserProfile);
      setEditedProfile({ ...editedProfile, image_url: publicUrl });
      
      Alert.alert('Success', 'Profile picture uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (userDataLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.imageContainer}>
          {profile.image_url ? (
            <Image
              source={{ uri: profile.image_url }}
              style={styles.image}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <Ionicons name="sync" size={20} color="white" />
            ) : (
              <Ionicons name="camera" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity 
              onPress={() => isEditing ? handleSave() : setIsEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Save' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.name}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
              />
            ) : (
              <Text style={styles.value}>{profile.name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.phone}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{profile.phone}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{profile.department}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Position</Text>
            <Text style={styles.value}>{profile.position}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employment Type</Text>
            <Text style={styles.value}>{profile.employment_type}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Work Mode</Text>
            <Text style={styles.value}>{profile.work_mode}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Joining</Text>
            <Text style={styles.value}>
              {formatDate(profile.join_company_date)}
            </Text>
          </View>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 20,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6A1B9A',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    paddingBottom: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#6A1B9A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#6A1B9A',
    paddingVertical: 4,
  },
  logoutSection: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#d9534f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
}); 