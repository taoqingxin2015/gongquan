/*
  # Create Default Admin User

  ## Overview
  This migration creates a default admin user account for system initialization.
  
  ## Default Admin Credentials
  - Email: admin@example.com
  - Password: 123456
  - Role: admin
  - Referral Code: SYSADMIN
  
  ## Changes
  1. Creates admin user in auth.users table
  2. Creates corresponding profile in profiles table
  
  ## Security Note
  Users should change the default password immediately after first login.
*/

-- Create the admin user in auth.users
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com';

  -- Only create if doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;

    -- Insert corresponding profile
    INSERT INTO profiles (
      id,
      email,
      name,
      role,
      referral_code,
      referred_by,
      payment_qr_code,
      status,
      witness_confirmed
    ) VALUES (
      admin_user_id,
      'admin@example.com',
      'Admin',
      'admin',
      'SYSADMIN',
      NULL,
      NULL,
      'active',
      true
    );

    RAISE NOTICE 'Default admin user created successfully with ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;
END $$;
