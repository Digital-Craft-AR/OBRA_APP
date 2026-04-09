import { useMemo, useState } from "react";
import { FolderOpen, HelpCircle, Home, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { ObraSidebar } from "@/components/obra/ObraSidebar";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { usePersistentSidebarCollapsed } from "@/hooks/usePersistentSidebarCollapsed";
import { buildSupportMailtoHref } from "@/lib/supportMailto";
import { getSupportEmail } from "@/lib/supportEmail";
import { supabase } from "@/lib/supabaseClient";

type FaqItem = {
  id: string;
  questionKey: string;
  answerKey: string;
};

const FAQ_ITEMS: readonly FaqItem[] = [
  { id: "what-is-obra", questionKey: "help.faq.q1.question", answerKey: "help.faq.q1.answer" },
  { id: "ui-vs-content-language", questionKey: "help.faq.q2.question", answerKey: "help.faq.q2.answer" },
  { id: "payments", questionKey: "help.faq.q3.question", answerKey: "help.faq.q3.answer" },
  { id: "credits", questionKey: "help.faq.q4.question", answerKey: "help.faq.q4.answer" },
  { id: "project-limits", questionKey: "help.faq.q5.question", answerKey: "help.faq.q5.answer" },
  { id: "download-pdfs", questionKey: "help.faq.q6.question", answerKey: "help.faq.q6.answer" },
  { id: "upload-file", questionKey: "help.faq.q7.question", answerKey: "help.faq.q7.answer" },
  { id: "delete-project", questionKey: "help.faq.q8.question", answerKey: "help.faq.q8.answer" },
  { id: "selling-page", questionKey: "help.faq.q9.question", answerKey: "help.faq.q9.answer" },
  { id: "contact", questionKey: "help.faq.q10.question", answerKey: "help.faq.q10.answer" },
];

export function HelpPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { session } = useAuth();
  const { creditsBalance } = useEntitlement();
  const { sidebarCollapsed, setSidebarCollapsed } = usePersistentSidebarCollapsed();
  const [openItemId, setOpenItemId] = useState<string>(FAQ_ITEMS[0]?.id ?? "");
  const supportEmail = getSupportEmail();
  const supportMailtoHref = buildSupportMailtoHref(supportEmail, { subject: t("help.contact.mailtoSubject") });

  const userName = useMemo(() => session?.user?.email ?? t("sidebar.userFallback"), [session?.user?.email, t]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-obra-blue-50">
      <ObraSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        navItems={[
          {
            id: "dashboard",
            label: t("nav.projects"),
            to: "/app/dashboard",
            active: location.pathname === "/app/dashboard",
            icon: <FolderOpen className="size-4" aria-hidden />,
          },
          {
            id: "settings",
            label: t("nav.settings"),
            to: "/app/settings/profile",
            active: location.pathname.startsWith("/app/settings"),
            icon: <Settings className="size-4" aria-hidden />,
          },
          {
            id: "help",
            label: t("nav.help"),
            to: "/app/help",
            active: location.pathname === "/app/help",
            icon: <HelpCircle className="size-4" aria-hidden />,
          },
          {
            id: "home",
            label: t("nav.home"),
            to: "/",
            icon: <Home className="size-4" aria-hidden />,
          },
        ]}
        userName={userName}
        credits={creditsBalance}
        onLogout={() => void signOut()}
        logoutLabel={t("nav.logout")}
      />

      <main className="flex min-h-0 flex-1 flex-col bg-white">
        <header className="flex h-18 shrink-0 items-center border-b border-obra-blue-100 px-10">
          <h1 className="font-display text-xl font-normal leading-none text-obra-blue-950">{t("help.title")}</h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-10">
          <div className="flex max-w-3xl flex-col gap-8">
            <p className="text-sm text-obra-neutral-600">{t("help.intro")}</p>

            <section aria-labelledby="help-faq-heading" className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
              <h2 id="help-faq-heading" className="font-display text-lg font-semibold text-obra-blue-950">
                {t("help.faqHeading")}
              </h2>
              <p className="mt-1 text-sm text-obra-neutral-600">{t("help.faqIntro")}</p>

              <div className="mt-5 divide-y divide-obra-blue-100">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openItemId === item.id;
                  return (
                    <div key={item.id} className="py-1">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-left text-sm font-semibold text-obra-blue-950 transition-colors hover:bg-obra-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        onClick={() => setOpenItemId((prev) => (prev === item.id ? "" : item.id))}
                      >
                        <span>{t(item.questionKey)}</span>
                        <span className="text-obra-neutral-600" aria-hidden>
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen ? (
                        <div id={`faq-panel-${item.id}`} className="px-3 pb-3 text-sm leading-relaxed text-obra-neutral-900">
                          <p>{t(item.answerKey)}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              aria-labelledby="help-contact-heading"
              className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card"
            >
              <h2 id="help-contact-heading" className="font-display text-lg font-semibold text-obra-blue-950">
                {t("help.contact.heading")}
              </h2>
              <p className="mt-1 text-sm text-obra-neutral-600">{t("help.contact.intro")}</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-body text-sm text-obra-neutral-900">
                  <span className="font-semibold">{t("help.contact.emailLabel")}: </span>
                  <span>{supportEmail}</span>
                </p>
                <a
                  href={supportMailtoHref}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-obra-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-obra-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
                >
                  {t("help.contact.cta")}
                </a>
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-obra-neutral-600">
                <li>{t("help.contact.tipWhatHappened")}</li>
                <li>{t("help.contact.tipNoSensitiveData")}</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
