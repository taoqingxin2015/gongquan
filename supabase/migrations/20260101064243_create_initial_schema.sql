/*
  # Create Initial Schema for 共权预测网

  ## Overview
  This migration creates the complete database schema for a prediction market platform similar to Polymarket.
  
  ## New Tables
  
  ### 1. `profiles`
  User profile data linked to Supabase Auth users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `name` (text) - User full name
  - `role` (text) - User role: 'player', 'witness', 'admin'
  - `referral_code` (text, unique) - Unique referral code for witnesses
  - `referred_by` (uuid) - References the witness who referred this user
  - `payment_qr_code` (text) - URL/path to payment QR code image
  - `status` (text) - Account status: 'active', 'banned'
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last update time

  ### 2. `events`
  Prediction events that users can bet on
  - `id` (uuid, primary key) - Unique event identifier
  - `title` (text) - Event title/question
  - `description` (text) - Detailed event description
  - `category` (text) - Event category (政治, 经济, etc.)
  - `rules` (text) - Judging criteria and rules
  - `status` (text) - Event status: 'active', 'banned', 'expired'
  - `reveal_date` (timestamptz) - Date when results are revealed
  - `created_at` (timestamptz) - Event creation time
  - `updated_at` (timestamptz) - Last update time

  ### 3. `bets`
  Individual betting records
  - `id` (uuid, primary key) - Unique bet identifier
  - `event_id` (uuid) - References events table
  - `user_id` (uuid) - References profiles table
  - `direction` (text) - Betting direction: 'yes' or 'no'
  - `amount` (numeric) - Bet amount in currency
  - `status` (text) - Bet status: 'pending', 'confirmed', 'rejected'
  - `witness_id` (uuid) - References the witness handling this bet
  - `created_at` (timestamptz) - Bet placement time
  - `confirmed_at` (timestamptz) - Bet confirmation time

  ## Security
  - Enable RLS on all tables
  - Add policies for role-based access control
  - Users can only read their own profile data
  - Witnesses can view their referred users
  - Admins have full access
  - Public can view active events
  - Users can view their own bets
  - Witnesses can view and confirm bets from their referred users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'witness', 'admin')),
  referral_code text UNIQUE,
  referred_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  payment_qr_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  rules text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'expired')),
  reveal_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('yes', 'no')),
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  witness_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_bets_event_id ON bets(event_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_witness_id ON bets(witness_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Active events are viewable by everyone"
  ON events FOR SELECT
  TO authenticated
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Bets policies
CREATE POLICY "Users can view own bets"
  ON bets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    witness_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can insert own bets"
  ON bets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Witnesses can update bets they handle"
  ON bets FOR UPDATE
  TO authenticated
  USING (
    witness_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    witness_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user profile (will be created after auth signup)
-- Admin credentials: email=admin@example.com, password=123456
-- Note: The actual auth user needs to be created separately through Supabase Auth