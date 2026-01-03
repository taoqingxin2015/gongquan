import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = existingUsers?.users.find(u => u.email === 'admin@example.com');

    if (adminUser) {
      console.log('Deleting existing admin user:', adminUser.id);
      await supabaseAdmin.auth.admin.deleteUser(adminUser.id);
    }

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@example.com',
      password: '123456',
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      console.error('Failed to create admin user:', signUpError);
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user: ' + signUpError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        referral_code: 'SYSADMIN',
        referred_by: null,
        payment_qr_code: null,
        status: 'active',
        witness_confirmed: true,
      });

    if (profileError) {
      console.error('Failed to create admin profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create admin profile: ' + profileError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Default admin user created successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Default admin user created',
        credentials: {
          email: 'admin@example.com',
          password: '123456',
          referralCode: 'SYSADMIN'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});