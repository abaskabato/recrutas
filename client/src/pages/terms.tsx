import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SmartLogo from "@/components/smart-logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <SmartLogo size={32} />
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Terms of Service</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500">Last updated: January 2025</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Recrutas, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Description of Service</h2>
            <p>
              Recrutas is a job matching platform that connects job seekers with employers.
              We provide tools for candidates to create profiles, upload resumes, and apply for jobs,
              and for employers to post jobs and find qualified candidates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. User Accounts</h2>
            <p>To use certain features of our platform, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the platform for illegal purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape or collect data without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Content</h2>
            <p>
              You retain ownership of content you submit to Recrutas. By submitting content,
              you grant us a license to use, display, and distribute that content in connection
              with our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Intellectual Property</h2>
            <p>
              The Recrutas platform, including its design, features, and content created by us,
              is protected by intellectual property laws. You may not copy, modify, or distribute
              our proprietary content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Disclaimers</h2>
            <p>
              Recrutas is provided "as is" without warranties of any kind. We do not guarantee
              that you will find employment or that employers will find suitable candidates.
              We are not responsible for the accuracy of job postings or candidate profiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Recrutas shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use
              of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of significant
              changes by posting a notice on our platform or sending you an email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">10. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:legal@recrutas.com" className="text-blue-600 hover:underline">
                legal@recrutas.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
