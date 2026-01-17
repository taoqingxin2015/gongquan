/*
  # Create Lottery System

  ## Overview
  This migration creates the database schema for the "福彩刮刮乐" (Lottery Scratch) system.
  
  ## New Tables
  
  ### `lottery_periods`
  Stores lottery period information including draw results
  - `id` (uuid, primary key) - Unique identifier
  - `period_number` (text, unique) - Period number (e.g., "2026001")
  - `expected_draw_date` (date) - Expected drawing date
  - `actual_draw_date` (date, nullable) - Actual drawing date
  - `status` (text) - Period status: 'accepting_bets', 'drawn', 'closed'
  - `winning_numbers` (jsonb, nullable) - Array of 7 lottery numbers
  - `winning_sequence_number` (integer, nullable) - Calculated winning sequence number
  - `total_amount` (numeric, default 0) - Total bet amount for this period
  - `prize_amount` (numeric, nullable) - Prize amount (80% of total)
  - `total_bets` (integer, default 0) - Total number of bets (注数)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `lottery_bets`
  Stores individual lottery bet records
  - `id` (uuid, primary key) - Unique identifier
  - `period_id` (uuid, foreign key) - Reference to lottery_periods
  - `user_id` (uuid, foreign key) - Reference to profiles (auth.users)
  - `bet_amount` (numeric) - Total bet amount (must be multiple of 2)
  - `bet_count` (integer) - Number of bets (bet_amount / 2)
  - `sequence_start` (integer) - Starting sequence number
  - `sequence_end` (integer) - Ending sequence number
  - `status` (text) - Bet status: 'pending', 'confirmed'
  - `payment_proof` (text, nullable) - Payment proof URL
  - `confirmed_by` (uuid, nullable) - Witness who confirmed (reference to profiles)
  - `confirmed_at` (timestamptz, nullable) - Confirmation timestamp
  - `created_at` (timestamptz) - Creation timestamp
  
  ## Security
  - Enable RLS on all tables
  - Authenticated users can view all lottery periods
  - Authenticated users can view confirmed lottery bets
  - Authenticated users can create their own bets
  - Users can view their own pending bets
  - Witnesses can confirm bets
  - Admins can manage lottery periods and draw results
*/

-- Create lottery_periods table
CREATE TABLE IF NOT EXISTS lottery_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number text UNIQUE NOT NULL,
  expected_draw_date date NOT NULL,
  actual_draw_date date,
  status text NOT NULL DEFAULT 'accepting_bets' CHECK (status IN ('accepting_bets', 'drawn', 'closed')),
  winning_numbers jsonb,
  winning_sequence_number integer,
  total_amount numeric DEFAULT 0,
  prize_amount numeric,
  total_bets integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lottery_bets table
CREATE TABLE IF NOT EXISTS lottery_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES lottery_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bet_amount numeric NOT NULL CHECK (bet_amount > 0 AND bet_amount::integer % 2 = 0),
  bet_count integer NOT NULL CHECK (bet_count > 0),
  sequence_start integer NOT NULL,
  sequence_end integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  payment_proof text,
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lottery_periods_status ON lottery_periods(status);
CREATE INDEX IF NOT EXISTS idx_lottery_periods_draw_date ON lottery_periods(expected_draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_bets_period ON lottery_bets(period_id);
CREATE INDEX IF NOT EXISTS idx_lottery_bets_user ON lottery_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_bets_status ON lottery_bets(status);

-- Enable RLS
ALTER TABLE lottery_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_bets ENABLE ROW LEVEL SECURITY;

-- Lottery Periods Policies

-- Authenticated users can view all lottery periods
CREATE POLICY "Authenticated users can view lottery periods"
  ON lottery_periods FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert lottery periods
CREATE POLICY "Admins can insert lottery periods"
  ON lottery_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update lottery periods
CREATE POLICY "Admins can update lottery periods"
  ON lottery_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Lottery Bets Policies

-- Authenticated users can view confirmed bets and their own bets
CREATE POLICY "Authenticated users can view confirmed bets"
  ON lottery_bets FOR SELECT
  TO authenticated
  USING (
    status = 'confirmed' OR user_id = auth.uid()
  );

-- Authenticated users can create their own bets
CREATE POLICY "Users can create own bets"
  ON lottery_bets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending bets
CREATE POLICY "Users can update own pending bets"
  ON lottery_bets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Witnesses can update bets to confirm them
CREATE POLICY "Witnesses can confirm bets"
  ON lottery_bets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('witness', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('witness', 'admin')
    )
  );

-- Create a default active lottery period
INSERT INTO lottery_periods (period_number, expected_draw_date, status)
VALUES ('2026001', '2026-01-21', 'accepting_bets')
ON CONFLICT (period_number) DO NOTHING;
