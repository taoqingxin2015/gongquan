import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
  referralCode?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '缺少 Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ 
          error: '登录已过期，请退出后重新登录',
          details: userError?.message || '无法验证用户',
          hint: '您可能在使用旧的登录会话，请先退出登录，然后使用新的管理员账户重新登录'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('User authenticated:', user.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );

    const body: UpdateProfileRequest = await req.json();
    console.log('Update request:', { userId: user.id, body });
    const updates: any = {};

    if (body.email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email: body.email }
      );

      if (emailError) {
        console.error('Email update error:', emailError);
        return new Response(
          JSON.stringify({ error: '邮箱更新失败: ' + emailError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      updates.email = body.email;
    }

    if (body.password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: body.password }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        return new Response(
          JSON.stringify({ error: '密码更新失败: ' + passwordError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (body.name) {
      updates.name = body.name;
    }

    if (body.referralCode !== undefined) {
      updates.referral_code = body.referralCode;
    }

    if (Object.keys(updates).length > 0) {
      console.log('Updating profile with admin client:', updates);
      
      const { data: updateData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      if (profileError) {
        console.error('Profile update error:', profileError);
        return new Response(
          JSON.stringify({ 
            error: '更新失败: ' + profileError.message,
            details: profileError,
            hint: profileError.hint,
            code: profileError.code
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      console.log('Profile updated successfully:', updateData);
    }

    console.log('Update successful');
    return new Response(
      JSON.stringify({ success: true, message: '更新成功' }),
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