/*
 *
 * Title: /profile/phone-verification
 * Description: Standalone phone-number OTP page, decoupled from the
 * full KYC step-1 form. Ordering is blocked only until the phone here is
 * verified — the rest of step 1 (personal info) is reviewed separately
 * on /profile/verification. Once verified, the number is stamped into
 * the step-1 placeholder row and auto-fills on the verification page.
 *
 * Supports a `redirect_url` query param so callers (e.g. the topup
 * page's "verify phone" modal) can send the user straight back after
 * verifying.
 *
 */
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FaCheck, FaPhoneAlt } from 'react-icons/fa';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import {
    getMyVerification,
    sendVerificationOtp,
    verifyVerificationOtp,
} from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import AuthGuard from '../../components/AuthGuard';
import Button from '../../components/Button';
import { __page_title_end, __redirect_url_key } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import routes from '../../config/routes';
import { getErrors, hasData } from '../../helpers/helpers';

function PhoneVerificationInner() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const redirectUrl = router?.query?.[__redirect_url_key] || null;

    const { data, isLoading, isError, error } = useQuery(
        'verification-me',
        getMyVerification,
        reactQueryConfig,
    );

    // reactQueryConfig.select unwraps res.data.data, so `data` IS the
    // inner payload (`{ enabled, phone_verified, phone, ... }`).
    const payload = data;
    const enabled = !!payload?.enabled;
    const alreadyVerified = !!payload?.phone_verified;
    const verifiedPhone = payload?.phone || '';

    const [phone, setPhone] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    // Seed the input from the server state once it loads.
    useEffect(() => {
        if (verifiedPhone) setPhone(verifiedPhone);
    }, [verifiedPhone]);

    const isVerified = alreadyVerified || otpVerified;

    const handleSendOtp = async () => {
        const trimmed = String(phone || '').trim();
        if (!trimmed) {
            toast.error('Enter a phone number');
            return;
        }
        setBusy(true);
        try {
            await sendVerificationOtp(trimmed);
            setOtpSent(true);
            toast.success('OTP sent. Check your phone.');
        } catch (err) {
            toast.error(getErrors(err));
        } finally {
            setBusy(false);
        }
    };

    const handleVerifyOtp = async () => {
        const trimmedPhone = String(phone || '').trim();
        const trimmedCode = String(code || '').trim();
        if (!trimmedCode) {
            toast.error('Enter the OTP code');
            return;
        }
        setBusy(true);
        try {
            await verifyVerificationOtp(trimmedPhone, trimmedCode);
            setOtpVerified(true);
            toast.success('Phone verified.');
            // Refresh the shared verification cache so the step-1 form
            // (and the order gate) immediately see the verified number.
            queryClient.invalidateQueries('verification-me');
        } catch (err) {
            toast.error(getErrors(err));
        } finally {
            setBusy(false);
        }
    };

    const handleContinue = () => {
        router.push(redirectUrl || routes.verification.name);
    };

    return (
        <>
            <Head>
                <title>Phone verification {__page_title_end}</title>
            </Head>
            <section className="container my-7 max-w-xl">
                <h1 className="_section_title mb-2">Phone verification</h1>
                <p className="text-sm text-gray-600 mb-5">
                    Verify your phone number with a one-time code. This is all
                    that&apos;s required to start ordering — the rest of your
                    account verification is reviewed separately.
                </p>

                <ActivityIndicator
                    data={data}
                    loading={isLoading}
                    error={isError ? error : false}
                />

                {hasData(data) && !enabled && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-4 text-amber-900">
                        <strong>Verification is currently disabled.</strong>
                        <p className="text-sm mt-1">
                            The site admin has not enabled the verification
                            module yet. No action is required from you.
                        </p>
                    </div>
                )}

                {hasData(data) && enabled && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                        {isVerified ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                                        <FaCheck />
                                    </span>
                                    <div>
                                        <div className="font-semibold">
                                            Phone verified
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {phone || verifiedPhone}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">
                                    You can now place orders. Continue to finish
                                    the remaining verification steps whenever
                                    you&apos;re ready.
                                </p>
                                <Button
                                    type="button"
                                    className="primary w-full"
                                    onClick={handleContinue}
                                >
                                    Continue
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Phone number
                                    </label>
                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center px-3 rounded bg-gray-100 text-gray-500">
                                            <FaPhoneAlt size={12} />
                                        </span>
                                        <input
                                            type="tel"
                                            className="flex-1 border border-gray-300 rounded px-3 py-2"
                                            placeholder="+8801XXXXXXXXX"
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={busy}
                                            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60 whitespace-nowrap"
                                        >
                                            {otpSent ? 'Resend OTP' : 'Send OTP'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        We&apos;ll send a 6-digit code by SMS.
                                    </p>
                                </div>

                                {otpSent && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            OTP code
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                className="flex-1 border border-gray-300 rounded px-3 py-2 tracking-widest font-mono"
                                                placeholder="6-digit code"
                                                value={code}
                                                onChange={(e) =>
                                                    setCode(
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={busy}
                                                className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-60"
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500">
                                    <Link href={routes.verification.name}>
                                        <a className="_link">
                                            Go to full account verification
                                        </a>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
}

function PhoneVerificationPage() {
    return (
        <AuthGuard>
            <PhoneVerificationInner />
        </AuthGuard>
    );
}

export default PhoneVerificationPage;
