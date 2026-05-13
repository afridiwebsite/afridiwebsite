import Head from 'next/head';
import { __page_title_end } from '../config/globalConfig';

function RefundReturnPolicyPage() {
  return (
    <>
      <Head>
        <title>Refund Policy {__page_title_end}</title>
      </Head>
      <section className="container my-8 max-w-3xl">
        <div className="legal-page animate-fade-in-up">
          <h1 className="legal-page-title">Refund &amp; Return Policy</h1>
          <p className="legal-page-updated">Last updated: today</p>

          <p>
            Because most products delivered through the service are digital and
            consumed instantly, refunds and returns are limited. The following
            rules apply.
          </p>

          <h2>1. Successful deliveries</h2>
          <p>
            Once a digital product has been delivered to your account, it is
            generally non-refundable.
          </p>

          <h2>2. Failed or partial deliveries</h2>
          <p>
            If an order fails or only partially completes, we will either retry
            the delivery or refund the unfulfilled amount to your wallet.
          </p>

          <h2>3. Cancellations</h2>
          <p>
            An order can only be cancelled while it is in the &quot;pending&quot;
            state and has not yet been processed.
          </p>

          <h2>4. Request a refund</h2>
          <p>
            Open a support ticket via the Contact Us page within 7 days of the
            order, with the order ID and a description of the issue.
          </p>

          <p className="legal-page-note">
            This is a placeholder. Replace with your final policy copy before
            launch.
          </p>
        </div>
      </section>
    </>
  );
}

export default RefundReturnPolicyPage;
