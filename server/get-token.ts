import { supabase } from "./lib/supabase-client";

async function getToken() {
  const email = "abaskabato@gmail.com";
  const password = "123456";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error.message);
    return;
  }

  if (data.session) {
    console.log(data.session.access_token);
  }
}

getToken();
