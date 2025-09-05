import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared-supabase";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Redirect } from "wouter";

export default function AuthPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  if (session) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google", "github"]}
            theme="dark"
          />
        </div>
      </div>
    </div>
  );
}