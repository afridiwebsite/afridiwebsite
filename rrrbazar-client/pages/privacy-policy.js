import Head from 'next/head';
import { __page_title_end } from '../config/globalConfig';

function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy {__page_title_end}</title>
      </Head>
      <section className="container my-8 max-w-3xl">
        <div className="legal-page animate-fade-in-up">
          <h1 className="legal-page-title">Privacy Policy</h1>
          <p className="legal-page-updated">Last updated: today</p>

          <p>
            This policy describes how we collect, use, and protect information
            you provide while using the service.
          </p>

          <h2>1. Information we collect</h2>
          <p>
            We collect the information you provide directly (e.g. account
            details, contact info) and basic technical data needed to operate
            the service.
          </p>

          <h2>2. How we use information</h2>
          <p>
            Your information is used to operate, secure and improve the service,
            to process orders, and to communicate with you about your account.
          </p>

          <h2>3. Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with
            service providers strictly to operate the service, or when required
            by law.
          </p>

          <h2>4. Your choices</h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal information by contacting support.
          </p>

          <h2>5. Contact</h2>
          <p>
            For privacy questions, please reach out via the Contact Us page.
          </p>

          <p className="legal-page-note">
            This is a placeholder. Replace with your final legal copy before
            launch.
          </p>
        </div>
      </section>
    </>
  );
}

export default PrivacyPolicyPage;
