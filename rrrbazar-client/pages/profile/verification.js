/*
 *
 * Title: /profile/verification
 * Description: User-facing KYC page. Renders one accordion section per
 * step (4 total), drives the phone OTP flow on step 1, and submits each
 * step's payload independently. Forms are tag-navigable from the
 * profile page — the URL hash `#step-N` opens the matching panel.
 *
 * The whole page short-circuits to a "Verification is not active" notice
 * when the master toggle in SiteSettings is off, even if there's data
 * in the DB. That's the contract Phase A established.
 *
 */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaTimes, FaClock, FaCamera, FaIdCard, FaUser, FaBriefcase, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import {
    getMyVerification,
    sendVerificationOtp,
    submitVerificationStep,
    uploadVerificationImage,
    verifyVerificationOtp,
} from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Button from '../../components/Button';
import { __page_title_end } from '../../config/globalConfig';
import reactQueryConfig from '../../config/reactQueryConfig';
import { getErrors, hasData, imgPath } from '../../helpers/helpers';

// Per-step icon + tint. Kept here (not on the server) so layout choices
// don't pollute the API contract — the schema's `step` number is the
// join key.
const STEP_VISUALS = {
    1: { icon: <FaUser />, color: '#3b82f6' },
    2: { icon: <FaIdCard />, color: '#8b5cf6' },
    3: { icon: <FaCamera />, color: '#10b981' },
    4: { icon: <FaBriefcase />, color: '#f59e0b' },
};

// Render a status pill matching the verified/under_review/rejected
// tri-state from the API.
function StatusPill({ status }) {
    if (status === 'verified') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <FaCheck size={10} /> Verified
            </span>
        );
    }
    if (status === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                <FaTimes size={10} /> Rejected
            </span>
        );
    }
    if (status === 'under_review') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                <FaClock size={10} /> Under review
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
            Not started
        </span>
    );
}

// Step 1 has the OTP flow on top of its regular fields, so it gets a
// dedicated form component. Steps 2/3/4 share `GenericStepForm`.
function Step1Form({ submission, onSubmitted, disabled }) {
    const data = submission?.data || {};
    const phoneAlreadyVerified = !!data.phone_verified_at;
    const isVerified = submission?.status === 'verified';

    const [phone, setPhone] = useState(data.phone || '');
    const [otpSent, setOtpSent] = useState(phoneAlreadyVerified);
    const [otpVerified, setOtpVerified] = useState(phoneAlreadyVerified);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    const [form, setForm] = useState({
        full_name: data.full_name || '',
        father_name: data.father_name || '',
        mother_name: data.mother_name || '',
        age: data.age || '',
        gender: data.gender || '',
        address: data.address || '',
    });

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
            toast.error(getErrors(err, false, true));
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
        } catch (err) {
            toast.error(getErrors(err, false, true));
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!otpVerified) {
            toast.error('Verify your phone with OTP first.');
            return;
        }
        setBusy(true);
        try {
            await submitVerificationStep(1, form);
            toast.success('Submitted. Awaiting admin review.');
            onSubmitted && onSubmitted();
        } catch (err) {
            toast.error(getErrors(err, false, true));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone number
                </label>
                <div className="flex gap-2">
                    <input
                        type="tel"
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                        placeholder="+8801XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={otpVerified || isVerified || disabled}
                    />
                    {!otpVerified && !isVerified && (
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={busy || disabled}
                            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                        >
                            {otpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Verified by SMS code. Locked once step 1 is verified — contact
                    support to change it.
                </p>
            </div>

            {otpSent && !otpVerified && (
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
                                setCode(e.target.value.replace(/\D/g, ''))
                            }
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={busy || disabled}
                            className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-60"
                        >
                            Verify
                        </button>
                    </div>
                </div>
            )}

            {otpVerified && (
                <div className="text-sm text-emerald-700 flex items-center gap-1">
                    <FaCheck /> Phone verified
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} disabled={isVerified || disabled} required />
                <TextField label="Father's name" value={form.father_name} onChange={(v) => setForm({ ...form, father_name: v })} disabled={isVerified || disabled} required />
                <TextField label="Mother's name" value={form.mother_name} onChange={(v) => setForm({ ...form, mother_name: v })} disabled={isVerified || disabled} required />
                <TextField label="Age" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} disabled={isVerified || disabled} required />
                <SelectField label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={['Male', 'Female', 'Other']} disabled={isVerified || disabled} required />
                <TextAreaField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} disabled={isVerified || disabled} required />
            </div>

            {!isVerified && (
                <Button
                    type="submit"
                    className="primary w-full"
                    loading={busy}
                    disabled={!otpVerified || disabled}
                >
                    {submission ? 'Resubmit' : 'Submit for review'}
                </Button>
            )}
        </form>
    );
}

// Generic form for steps 2/3/4. Renders the field list from the schema
// the API returned — keeps the storefront in sync with server-side
// changes without redeploys.
function GenericStepForm({ step, fields, submission, onSubmitted, disabled }) {
    const isVerified = submission?.status === 'verified';
    const [form, setForm] = useState(() => {
        const init = {};
        for (const f of fields) init[f.key] = (submission?.data || {})[f.key] || '';
        return init;
    });
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState({});

    const handleUpload = async (key, file) => {
        if (!file) return;
        setUploading((p) => ({ ...p, [key]: true }));
        try {
            const res = await uploadVerificationImage(file);
            const path = res?.data?.data?.path || res?.data?.path;
            setForm((p) => ({ ...p, [key]: path }));
        } catch (err) {
            toast.error(getErrors(err, false, true));
        } finally {
            setUploading((p) => ({ ...p, [key]: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await submitVerificationStep(step, form);
            toast.success('Submitted. Awaiting admin review.');
            onSubmitted && onSubmitted();
        } catch (err) {
            toast.error(getErrors(err, false, true));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map((f) => {
                    if (f.type === 'select') {
                        return (
                            <SelectField
                                key={f.key}
                                label={f.label}
                                value={form[f.key]}
                                onChange={(v) => setForm({ ...form, [f.key]: v })}
                                options={f.options || []}
                                required={f.required}
                                help={f.help}
                                disabled={isVerified || disabled}
                            />
                        );
                    }
                    if (f.type === 'textarea') {
                        return (
                            <TextAreaField
                                key={f.key}
                                label={f.label}
                                value={form[f.key]}
                                onChange={(v) => setForm({ ...form, [f.key]: v })}
                                required={f.required}
                                help={f.help}
                                disabled={isVerified || disabled}
                            />
                        );
                    }
                    if (f.type === 'file') {
                        return (
                            <FileField
                                key={f.key}
                                label={f.label}
                                value={form[f.key]}
                                onUpload={(file) => handleUpload(f.key, file)}
                                uploading={!!uploading[f.key]}
                                required={f.required}
                                help={f.help}
                                disabled={isVerified || disabled}
                            />
                        );
                    }
                    return (
                        <TextField
                            key={f.key}
                            label={f.label}
                            type={f.type === 'number' ? 'number' : 'text'}
                            value={form[f.key]}
                            onChange={(v) => setForm({ ...form, [f.key]: v })}
                            required={f.required}
                            help={f.help}
                            disabled={isVerified || disabled}
                        />
                    );
                })}
            </div>
            {!isVerified && (
                <Button
                    type="submit"
                    className="primary w-full"
                    loading={busy}
                    disabled={disabled}
                >
                    {submission ? 'Resubmit' : 'Submit for review'}
                </Button>
            )}
        </form>
    );
}

function TextField({ label, value, onChange, type = 'text', required, disabled, help }) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <input
                type={type}
                className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required}
            />
            {help && <span className="text-xs text-gray-500 mt-1 block">{help}</span>}
        </label>
    );
}

function SelectField({ label, value, onChange, options, required, disabled, help }) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <select
                className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required}
            >
                <option value="">-- Select --</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
            {help && <span className="text-xs text-gray-500 mt-1 block">{help}</span>}
        </label>
    );
}

function TextAreaField({ label, value, onChange, required, disabled, help }) {
    return (
        <label className="block md:col-span-2">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <textarea
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required}
            />
            {help && <span className="text-xs text-gray-500 mt-1 block">{help}</span>}
        </label>
    );
}

function FileField({ label, value, onUpload, uploading, required, disabled, help }) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <input
                type="file"
                accept="image/*"
                className="w-full border border-gray-300 rounded px-3 py-2"
                onChange={(e) => onUpload(e.target.files?.[0])}
                disabled={disabled || uploading}
            />
            {value && (
                <div className="mt-2">
                    <img
                        src={imgPath(value)}
                        alt={label}
                        className="max-h-32 rounded border border-gray-200"
                    />
                </div>
            )}
            {uploading && (
                <p className="text-xs text-blue-700 mt-1">Uploading…</p>
            )}
            {help && <span className="text-xs text-gray-500 mt-1 block">{help}</span>}
        </label>
    );
}

// One accordion panel — collapsed by default, expanded when its hash is
// active or the user clicks the header.
function StepPanel({ step, submission, isOpen, onToggle, disabled, onSubmitted }) {
    const visual = STEP_VISUALS[step.step] || { icon: null, color: '#6b7280' };
    return (
        <section
            id={`step-${step.step}`}
            className="border border-gray-200 rounded-lg bg-white overflow-hidden scroll-mt-24"
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
                <div className="flex items-center gap-3 text-left">
                    <span
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-lg"
                        style={{
                            color: visual.color,
                            background: `${visual.color}1a`,
                        }}
                    >
                        {visual.icon}
                    </span>
                    <div>
                        <div className="font-semibold text-gray-800">
                            Step {step.step}: {step.title}
                        </div>
                        <div className="text-xs text-gray-500">
                            {submission?.status === 'rejected' && submission.rejection_reason
                                ? `Rejected — ${submission.rejection_reason}`
                                : submission?.status
                                  ? `Last submitted ${new Date(submission.updated_at || submission.created_at).toLocaleDateString()}`
                                  : 'Not started yet'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusPill status={submission?.status} />
                    {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                </div>
            </button>
            {isOpen && (
                <div className="px-4 py-4 border-t border-gray-200">
                    {step.step === 1 ? (
                        <Step1Form
                            submission={submission}
                            onSubmitted={onSubmitted}
                            disabled={disabled}
                        />
                    ) : (
                        <GenericStepForm
                            step={step.step}
                            fields={step.fields}
                            submission={submission}
                            onSubmitted={onSubmitted}
                            disabled={disabled}
                        />
                    )}
                </div>
            )}
        </section>
    );
}

function VerificationPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data, isLoading, isError, error } = useQuery(
        'verification-me',
        getMyVerification,
        reactQueryConfig,
    );

    const payload = data?.data?.data;
    const enabled = !!payload?.enabled;
    const steps = payload?.steps || [];
    const submissions = payload?.submissions || {};
    const counts = payload?.counts;
    const allVerified = !!payload?.all_verified;

    // Open panel state — drives the accordion. Defaults to step 1, but
    // a `#step-N` URL hash from the profile tag links jumps straight to
    // the matching panel.
    const [openStep, setOpenStep] = useState(1);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash.replace('#step-', '');
        const n = Number(hash);
        if (n >= 1 && n <= 4) setOpenStep(n);
    }, [router.asPath]);

    const refresh = () => queryClient.invalidateQueries('verification-me');

    return (
        <>
            <Head>
                <title>Account verification {__page_title_end}</title>
            </Head>
            <section className="container my-7">
                <h1 className="_section_title mb-2">Account verification</h1>
                <p className="text-sm text-gray-600 mb-5">
                    Complete each step to unlock ordering, withdrawals, and the
                    reseller programme. Each step is reviewed independently — you
                    only need to resubmit the ones an admin marks rejected.
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
                            The site admin has not enabled the verification module
                            yet. No action is required from you.
                        </p>
                    </div>
                )}

                {hasData(data) && enabled && (
                    <>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <div className="text-sm text-gray-500">Progress</div>
                                <div className="text-lg font-bold">
                                    {counts?.verified || 0} / {counts?.total_steps || 4} steps verified
                                </div>
                            </div>
                            {allVerified ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                    <FaCheck /> Fully verified
                                </span>
                            ) : payload?.order_blocked ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 text-red-800 font-semibold">
                                    Orders blocked — complete step 1
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                                    Ordering enabled
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {steps.map((step) => (
                                <StepPanel
                                    key={step.step}
                                    step={step}
                                    submission={submissions[String(step.step)]}
                                    isOpen={openStep === step.step}
                                    onToggle={() =>
                                        setOpenStep(openStep === step.step ? -1 : step.step)
                                    }
                                    onSubmitted={refresh}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </>
    );
}

export default VerificationPage;
