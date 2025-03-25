export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          id: string
          user_id: string
          check_in: string
          check_out: string | null
          location: Json | null
          total_hours: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          check_in: string
          check_out?: string | null
          location?: Json | null
          total_hours?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_in?: string
          check_out?: string | null
          location?: Json | null
          total_hours?: number | null
          created_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          leave_type: string
          status: 'pending' | 'approved' | 'rejected'
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          leave_type: string
          status?: 'pending' | 'approved' | 'rejected'
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          leave_type?: string
          status?: 'pending' | 'approved' | 'rejected'
          reason?: string
          created_at?: string
        }
      }
      surveys: {
        Row: {
          id: string
          title: string
          description: string
          is_anonymous: boolean
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          is_anonymous: boolean
          start_date: string
          end_date: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          is_anonymous?: boolean
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }
      survey_questions: {
        Row: {
          id: string
          survey_id: string
          question: string
          type: 'multiple_choice' | 'text' | 'rating'
          options: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          question: string
          type: 'multiple_choice' | 'text' | 'rating'
          options?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          question?: string
          type?: 'multiple_choice' | 'text' | 'rating'
          options?: Json | null
          created_at?: string
        }
      }
      survey_responses: {
        Row: {
          id: string
          survey_id: string
          question_id: string
          user_id: string | null
          response: Json
          created_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          question_id: string
          user_id?: string | null
          response: Json
          created_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          question_id?: string
          user_id?: string | null
          response?: Json
          created_at?: string
        }
      }
      recognitions: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          message: string
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          message: string
          points: number
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          message?: string
          points?: number
          created_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          title: string
          description: string
          points_required: number
          image_url: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          points_required: number
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          points_required?: number
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
      }
      reward_redemptions: {
        Row: {
          id: string
          user_id: string
          reward_id: string
          points_spent: number
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reward_id: string
          points_spent: number
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reward_id?: string
          points_spent?: number
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
      }
    }
  }
} 