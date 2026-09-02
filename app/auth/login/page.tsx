import { LoginForm } from "@/components/login-form";
import { isDemoAdminEnabled } from "@/lib/auth/demo-admin";

export default function Page() {
  return <LoginForm enableLocalDemoLogin={isDemoAdminEnabled()} />;
}
