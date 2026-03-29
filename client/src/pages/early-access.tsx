import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckCircle2, Sparkles, Loader2,
  Zap, Shield, Clock, Menu, X,
} from "lucide-react";
import SmartLogo from "@/components/smart-logo";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useToast } from "@/hooks/use-toast";

export default function EarlyAccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pick up ?source= from URL if present
  const source = new URLSearchParams(window.location.search).get("source") || "early-access-page";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden">

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 lg:hidden flex flex-col">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <span className="text-white font-bold text-lg">Recrutas</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-2 p-6 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-300 text-lg font-medium">Theme</span>
              <ThemeToggleButton />
            </div>
            <button onClick={() => { setMobileMenuOpen(false); setLocation("/"); }}
              className="text-left text-gray-300 hover:text-white py-3 text-lg font-medium border-b border-gray-800">
              Home
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setLocation("/auth"); }}
              className="text-left text-gray-300 hover:text-white py-3 text-lg font-medium border-b border-gray-800">
              Sign In
            </button>
          </nav>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2.5">
              <SmartLogo size={28} showText={false} />
              <span className="font-bold text-lg text-black dark:text-white tracking-tight">Recrutas</span>
            </a>
            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggleButton />
              <Button variant="ghost" size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                onClick={() => setLocation("/auth")}>
                Sign In
              </Button>
            </div>
            <button className="lg:hidden text-black dark:text-white p-1"
              onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero + Form */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: manifesto */}
            <div>
              <div className="mb-6 inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">
                <Sparkles className="w-3 h-3 mr-1.5" />
                A Movement, Not Just a Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white leading-[1.1] tracking-tight mb-6">
                The hiring system<br />is broken.
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
                Gatekeepers, bias, and silence have had their time. We reject it.
              </p>

              {/* Beliefs */}
              <div className="space-y-4 mb-8">
                {[
                  { icon: Shield, text: "Every candidate deserves a response." },
                  { icon: Zap, text: "Talent knows no boundaries." },
                  { icon: Clock, text: "Hiring must be driven by skill, fairness, and transparency." },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-medium">{text}</p>
                  </div>
                ))}
              </div>

              <p className="text-lg text-black dark:text-white font-semibold leading-relaxed max-w-lg">
                We're building a platform to dismantle the old ways and create a
                new future for hiring. Join us. Together, we will redefine opportunity.
              </p>
            </div>

            {/* Right: form or success */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              {submitted ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-black dark:text-white mb-3">
                    You're on the list!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Check your email for a confirmation. We'll send your invite code
                    as soon as a spot opens up.
                  </p>
                  <Button variant="outline" onClick={() => setLocation("/")}
                    className="rounded-xl">
                    Back to Home
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 shadow-lg">
                  <h2 className="text-xl font-bold text-black dark:text-white mb-1">
                    Request Early Access
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Free forever for candidates. No credit card required.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          First name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Last name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl h-11 text-sm font-semibold"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                      ) : (
                        <>Get Early Access <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>

                    <p className="text-xs text-gray-400 text-center">
                      No spam. We'll only email you your invite code.
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SmartLogo size={20} showText={false} />
              <span className="text-sm font-medium text-black dark:text-white">Recrutas</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Recrutas. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
