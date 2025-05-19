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
  leave?: number;
  image_url?: string;
  join_company_date?: string;
  left_company_date?: string;
}

export function getUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    async function loadUserData() {
      if (!mounted) return;
      
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
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        if (mounted) {
          setUserData(data || {
            id: user.id,
            email: user.email || '',
          });
        }
        
        // Now that we have the user ID, set up the subscription
        if (mounted && !channel && user.id) {
          setupSubscription(user.id);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load user data'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    function setupSubscription(userId: string) {
      // Subscribe to user profile changes with the actual user ID
      channel = supabase
        .channel('profile_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        }, () => {
          // Reload user data when profile changes
          loadUserData();
        })
        .subscribe();
    }

    // Initial load
    loadUserData();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Reload data on auth state changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setUserData(null);
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
  }, []);

  return { userData, loading, error };
} 