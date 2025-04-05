import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  role?: string;
  department?: string;
  position?: string;
  employment_type?: string;
  work_mode?: string;
  points?: string;
  phone?: string;
  image_url?: string;
  join_company_date?: string;
  left_company_date?: string;
}

export function getUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        
        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        if (!user) {
          setLoading(false);
          return;
        }

        // Get the user profile data
        const { data, error: profileError } = await supabase
          .from('users')
          .select('id, email, name, role, department, position, employment_type, work_mode, points, phone, image_url, join_company_date, left_company_date')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setUserData(data || {
          id: user.id,
          email: user.email || '',
        });
      } catch (err) {
        console.error('Error loading user data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load user data'));
      } finally {
        setLoading(false);
      }
    }

    loadUserData();

    // Subscribe to user profile changes
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${supabase.auth.getUser().then(({data}) => data.user?.id)}`,
      }, () => {
        loadUserData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { userData, loading, error };
} 