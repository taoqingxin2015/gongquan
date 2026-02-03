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

    // Get all soft-deleted users from profiles
    const { data: deletedProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, deleted_at')
      .not('deleted_at', 'is', null);

    if (profilesError) {
      console.error('Error fetching deleted profiles:', profilesError);
      return new Response(
        JSON.stringify({
          error: '获取已删除用户失败: ' + profilesError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${deletedProfiles?.length || 0} soft-deleted users`);

    const results = {
      totalFound: deletedProfiles?.length || 0,
      deleted: [] as string[],
      errors: [] as { userId: string; email: string; error: string }[],
    };

    // Delete each user from auth.users
    if (deletedProfiles && deletedProfiles.length > 0) {
      for (const profile of deletedProfiles) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            profile.id
          );

          if (deleteError) {
            console.error(`Failed to delete user ${profile.id}:`, deleteError);
            results.errors.push({
              userId: profile.id,
              email: profile.email,
              error: deleteError.message,
            });
          } else {
            console.log(`Successfully deleted user ${profile.id} (${profile.email})`);
            results.deleted.push(profile.email);
          }
        } catch (err) {
          console.error(`Exception deleting user ${profile.id}:`, err);
          results.errors.push({
            userId: profile.id,
            email: profile.email,
            error: String(err),
          });
        }
      }
    }

    console.log('Cleanup completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功清理 ${results.deleted.length} 个无效用户`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: '清理失败: ' + (error instanceof Error ? error.message : String(error)),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
