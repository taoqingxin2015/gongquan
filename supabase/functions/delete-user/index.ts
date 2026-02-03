import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteUserRequest {
  userId?: string;
  email?: string;
  bypassAuth?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("服务配置错误");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { userId, email, bypassAuth }: DeleteUserRequest = await req.json();

    if (!bypassAuth) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("需要授权");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("认证失败: " + authError.message);
      }

      if (!user) {
        throw new Error("用户未登录");
      }

      const { data: adminProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error("获取用户信息失败: " + profileError.message);
      }

      if (!adminProfile || adminProfile.role !== "admin") {
        throw new Error("需要管理员权限");
      }
    }

    if (!userId && !email) {
      throw new Error("请提供 userId 或 email");
    }

    const results = {
      authUsersDeleted: [] as string[],
      profilesDeleted: [] as string[],
      errors: [] as string[],
    };

    if (email) {
      console.log(`Cleaning up email: ${email}`);

      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        results.errors.push(`列出用户失败: ${listError.message}`);
      } else {
        const matchingUsers = authUsers.users.filter(u => u.email === email);
        console.log(`Found ${matchingUsers.length} users in auth.users with email ${email}`);

        for (const user of matchingUsers) {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          if (deleteError) {
            results.errors.push(`删除 auth.users 用户 ${user.id} 失败: ${deleteError.message}`);
          } else {
            results.authUsersDeleted.push(user.id);
          }
        }
      }

      const { data: deleted, error: deleteProfilesError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("email", email)
        .select("id");

      if (deleteProfilesError) {
        results.errors.push(`删除 profiles 记录失败: ${deleteProfilesError.message}`);
      } else if (deleted) {
        results.profilesDeleted = deleted.map(p => p.id);
      }

      const totalDeleted = results.authUsersDeleted.length + results.profilesDeleted.length;
      const message = totalDeleted > 0
        ? `成功清理邮箱 ${email}：从 auth.users 删除 ${results.authUsersDeleted.length} 条，从 profiles 删除 ${results.profilesDeleted.length} 条`
        : `未找到邮箱 ${email} 的任何记录`;

      return new Response(
        JSON.stringify({ success: totalDeleted > 0, message, results }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (userId) {
      console.log("Attempting to delete user:", userId);

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        console.error("Delete auth error:", deleteAuthError);
        throw new Error("删除认证账号失败: " + deleteAuthError.message);
      }

      console.log("Auth user deleted, now soft deleting profile");

      const { error: softDeleteError } = await supabaseAdmin
        .from("profiles")
        .update({
          deleted_at: new Date().toISOString(),
          status: 'banned'
        })
        .eq("id", userId);

      if (softDeleteError) {
        console.error("Soft delete profile error:", softDeleteError);
        throw new Error("更新用户状态失败: " + softDeleteError.message);
      }

      console.log("User deleted successfully:", userId);

      return new Response(
        JSON.stringify({ success: true, message: "用户已删除" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("未知错误");
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "删除失败" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
