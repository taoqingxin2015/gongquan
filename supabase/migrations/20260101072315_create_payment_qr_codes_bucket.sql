/*
  # Create Storage Bucket for Payment QR Codes

  1. New Storage Bucket
    - `payment-qr-codes` bucket for storing witness payment QR code images
    - Public bucket to allow viewing uploaded QR codes
    - File size limit: 5MB
    - Allowed MIME types: image formats only

  2. Security Policies
    - Authenticated users can upload files (INSERT)
    - Anyone can view files (SELECT)
    - Users can update their own uploaded files (UPDATE)
    - Users can delete their own uploaded files (DELETE)
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr-codes',
  'payment-qr-codes',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload payment QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-qr-codes');

-- Allow public access to view files (since bucket is public)
CREATE POLICY "Public can view payment QR codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-qr-codes');

-- Allow users to update their own files
CREATE POLICY "Users can update own payment QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-qr-codes' AND owner::uuid = auth.uid())
WITH CHECK (bucket_id = 'payment-qr-codes');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own payment QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-qr-codes' AND owner::uuid = auth.uid());