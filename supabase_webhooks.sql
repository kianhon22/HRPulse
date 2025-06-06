-- Database Webhooks for Push Notifications
-- Run these in your Supabase SQL Editor after deploying the edge function

-- 1. Webhook for Leave Status Changes
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url:='https://your-project-ref.functions.supabase.co/push-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:=jsonb_build_object(
          'type', 'UPDATE',
          'table', 'leaves',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD),
          'schema', 'public'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for leaves table
DROP TRIGGER IF EXISTS leave_status_notification_trigger ON leaves;
CREATE TRIGGER leave_status_notification_trigger
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_status_change();

-- 2. Webhook for Survey Status Changes
CREATE OR REPLACE FUNCTION notify_survey_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to Active
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Active' THEN
    PERFORM
      net.http_post(
        url:='https://your-project-ref.functions.supabase.co/push-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:=jsonb_build_object(
          'type', 'UPDATE',
          'table', 'surveys',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD),
          'schema', 'public'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for surveys table
DROP TRIGGER IF EXISTS survey_status_notification_trigger ON surveys;
CREATE TRIGGER survey_status_notification_trigger
  AFTER UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION notify_survey_status_change();

-- 3. Webhook for Reward Redemption Status Changes
CREATE OR REPLACE FUNCTION notify_reward_redemption_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url:='https://your-project-ref.functions.supabase.co/push-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:=jsonb_build_object(
          'type', 'UPDATE',
          'table', 'reward_redemptions',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD),
          'schema', 'public'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reward_redemptions table
DROP TRIGGER IF EXISTS reward_redemption_status_notification_trigger ON reward_redemptions;
CREATE TRIGGER reward_redemption_status_notification_trigger
  AFTER UPDATE ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_reward_redemption_status_change();

-- 4. Webhook for Recognition Status Changes
CREATE OR REPLACE FUNCTION notify_recognition_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url:='https://your-project-ref.functions.supabase.co/push-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:=jsonb_build_object(
          'type', 'UPDATE',
          'table', 'recognitions',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD),
          'schema', 'public'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for recognitions table
DROP TRIGGER IF EXISTS recognition_status_notification_trigger ON recognitions;
CREATE TRIGGER recognition_status_notification_trigger
  AFTER UPDATE ON recognitions
  FOR EACH ROW
  EXECUTE FUNCTION notify_recognition_status_change();

-- Note: Replace 'your-project-ref' with your actual Supabase project reference
-- You can find this in your Supabase dashboard URL: https://your-project-ref.supabase.co 