import { ObraLogoLink } from "@/components/obra/ObraLogoLink";

/** Top bar for login, register, and OAuth callback error (matches subscription shell context). */
export function AuthFlowHeader() {
  return (
    <header className="border-b border-obra-blue-100 px-6 py-4">
      <ObraLogoLink />
    </header>
  );
}
