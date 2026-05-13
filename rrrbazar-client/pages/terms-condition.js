import Head from 'next/head';
import { __page_title_end } from '../config/globalConfig';

function TermsConditionPage() {
  return (
    <>
      <Head>
        <title>Terms &amp; Conditions {__page_title_end}</title>
      </Head>
      <section className="container my-8 max-w-3xl">
        <div className="legal-page animate-fade-in-up">
          <h1 className="legal-page-title">Terms &amp; Conditions</h1>
          <p className="legal-page-updated">Last updated: today</p>

          <p>
            Welcome. By accessing or using this service you agree to be bound by
            the following terms. Please read them carefully.
          </p>

          <h2>1. Use of service</h2>
          <p>
            You agree to use the service only for lawful purposes and in a way
            that does not infringe on the rights of others or restrict their
            use of the service.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You are responsible for keeping your account credentials secure and
            for all activity that happens under your account.
          </p>

          <h2>3. Orders &amp; payments</h2>
          <p>
            All orders are subject to availability and confirmation. Prices may
            change without notice; the price at the time of confirmation
            applies.
          </p>

          <h2>4. Limitation of liability</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for any indirect or consequential damages.
          </p>

          <h2>5. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service after changes are posted constitutes acceptance of the
            updated terms.
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

export default TermsConditionPage;
