import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import { getErrors, toastDefault } from "../../utils/handler.utils";
import Loader from "../Loader/Loader";

// SMS / OTP gateway config. Phase A of the verification module — this
// page lives on its own (not bolted onto SiteSettings) because:
//   1. the credentials are sensitive enough to deserve a dedicated screen
//      that can later get its own permission check,
//   2. we want a "Test send" button that's only useful in this context,
//   3. swapping providers should be possible without reloading the entire
//      site-settings form.
//
// Defaults are wired for sms.net.bd (https://portal.sms.net.bd/) which is
// what the admin specified, but the URL is fully editable so any gateway
// that accepts the standard `api_key / msg / to / sender_id` form-POST
// shape works without code changes — see helpers/smsProvider.ts.
function SmsProvider() {
    // Pulls the site-settings record so we can hydrate the form. We share
    // the read endpoint with the general SiteSettings page; the write path
    // is dedicated so this form only ever touches SMS fields.
    const [refresh, setRefresh] = useState(false);
    const [data, loading] = useGet("admin/site-settings", "", refresh);

    const url = useRef(null);
    const username = useRef(null);
    const apiKey = useRef(null);
    const senderId = useRef(null);
    const template = useRef(null);

    // Test-send state — kept separate from save state so the admin can
    // adjust + test repeatedly without each test resetting the form.
    const [testPhone, setTestPhone] = useState("");
    const [testMessage, setTestMessage] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [busy, setBusy] = useState(false);

    // Hydrate the form once the GET resolves. defaultValue on the inputs
    // would only set on first mount, so we drive them via refs + an
    // effect that fires whenever `data` changes (e.g. after Save when
    // we toggle `refresh`).
    useEffect(() => {
        if (!data) return;
        if (url.current) url.current.value = data.sms_provider_url || "";
        if (username.current)
            username.current.value = data.sms_provider_username || "";
        if (apiKey.current) apiKey.current.value = data.sms_provider_api_key || "";
        if (senderId.current)
            senderId.current.value = data.sms_provider_sender_id || "";
        if (template.current)
            template.current.value =
                data.sms_message_template ||
                "Your verification code is {code}. It expires in {minutes} minutes.";
    }, [data]);

    const submit = (e) => {
        e.preventDefault();
        setBusy(true);
        axiosInstance
            .post("/admin/site-settings/sms-provider", {
                sms_provider_url: url.current.value,
                sms_provider_username: username.current.value,
                sms_provider_api_key: apiKey.current.value,
                sms_provider_sender_id: senderId.current.value,
                sms_message_template: template.current.value,
            })
            .then(() => {
                toast.success("SMS provider saved", toastDefault);
                setRefresh((p) => !p);
            })
            .catch((err) =>
                toast.error(getErrors(err, false, true), toastDefault),
            )
            .finally(() => setBusy(false));
    };

    const sendTest = async () => {
        if (!testPhone.trim()) {
            toast.error("Enter a phone number to test", toastDefault);
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axiosInstance.post(
                "/admin/site-settings/sms-provider/test",
                {
                    phone: testPhone.trim(),
                    message: testMessage.trim(),
                },
            );
            setTestResult({
                ok: true,
                message: res?.data?.message || "Sent",
                upstream: res?.data?.data?.upstream,
            });
            toast.success("Test SMS sent", toastDefault);
        } catch (err) {
            // The endpoint returns a 502 with the upstream body attached on
            // gateway failures; surface both pieces so the admin can see
            // exactly what the provider said back.
            const payload = err?.response?.data;
            setTestResult({
                ok: false,
                message: payload?.message || getErrors(err, false, true),
                upstream: payload?.data?.upstream,
            });
            toast.error(
                payload?.message || getErrors(err, false, true),
                toastDefault,
            );
        } finally {
            setTesting(false);
        }
    };

    return (
        <section className="relative container_admin">
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">
                        SMS / OTP provider
                    </h3>
                </div>
                <div className="py-8 px-4">
                    <div className="w-full md:w-[70%] mx-auto relative border border-gray-200 px-4 py-6 rounded">
                        {(loading || busy) && <Loader absolute />}

                        <div className="mb-5 p-3 border border-blue-100 bg-blue-50 rounded text-sm text-blue-900">
                            These credentials power the phone-number OTP step of the
                            user verification module. The defaults target{" "}
                            <a
                                href="https://portal.sms.net.bd/"
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                            >
                                portal.sms.net.bd
                            </a>{" "}
                            but the URL is fully editable — any gateway that accepts
                            a form-POST with <code>api_key</code>, <code>to</code>,
                            and <code>msg</code> will work. The module is{" "}
                            <strong>disabled</strong> until you flip{" "}
                            <em>Enable verification module</em> on the{" "}
                            <a
                                href="/site-settings"
                                className="text-blue-600 underline"
                            >
                                Site Settings
                            </a>{" "}
                            page.
                        </div>

                        {data && (
                            <form onSubmit={submit}>
                                <div className="form_grid">
                                    <div className="md:col-span-2">
                                        <label>Gateway URL</label>
                                        <input
                                            ref={url}
                                            className="form_input"
                                            type="url"
                                            placeholder="https://api.sms.net.bd/sendsms"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            The endpoint that receives the form-POST.
                                        </p>
                                    </div>
                                </div>

                                <div className="form_grid">
                                    <div>
                                        <label>Account username</label>
                                        <input
                                            ref={username}
                                            className="form_input"
                                            type="text"
                                            placeholder="Gateway account login / username"
                                            autoComplete="off"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sent as <code>UserName</code> — required by MiMSMS and
                                            similar JSON gateways alongside the API key.
                                        </p>
                                    </div>
                                </div>

                                <div className="form_grid">
                                    <div>
                                        <label>API key</label>
                                        <input
                                            ref={apiKey}
                                            className="form_input"
                                            type="text"
                                            placeholder="Your gateway API key"
                                            autoComplete="off"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sent as the <code>Apikey</code> field.
                                        </p>
                                    </div>
                                    <div>
                                        <label>Sender ID (optional)</label>
                                        <input
                                            ref={senderId}
                                            className="form_input"
                                            type="text"
                                            placeholder="e.g. RRRBAZAR"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Some gateways accept a sender label. Leave blank if
                                            yours doesn&apos;t require one.
                                        </p>
                                    </div>
                                </div>

                                <div className="form_grid">
                                    <div className="md:col-span-2">
                                        <label>OTP message template</label>
                                        <textarea
                                            ref={template}
                                            className="form_input"
                                            rows={3}
                                            placeholder="Your verification code is {code}. It expires in {minutes} minutes."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            <code>{"{code}"}</code> is replaced with the
                                            generated OTP and <code>{"{minutes}"}</code> with the
                                            expiry window (default 5).
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="cstm_btn w-full block"
                                    >
                                        Save provider
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Test-send block — separated so saving the form and
                            firing a test are independent actions. */}
                        <div className="mt-8 border-t border-gray-200 pt-6">
                            <h4 className="font-bold mb-3">Test send</h4>
                            <p className="text-xs text-gray-500 mb-3">
                                Fires a one-off SMS to a phone number using the
                                <em> currently saved</em> credentials. Save the form first
                                if you changed anything.
                            </p>
                            <div className="form_grid">
                                <div>
                                    <label>Phone number</label>
                                    <input
                                        className="form_input"
                                        type="tel"
                                        placeholder="+8801234567890"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>Custom message (optional)</label>
                                    <input
                                        className="form_input"
                                        type="text"
                                        placeholder="Leave blank for a default test message"
                                        value={testMessage}
                                        onChange={(e) => setTestMessage(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={sendTest}
                                disabled={testing}
                                className="cstm_btn !bg-blue-600 hover:!bg-blue-700 disabled:opacity-60 mt-3"
                            >
                                {testing ? "Sending…" : "Send test SMS"}
                            </button>

                            {testResult && (
                                <div
                                    className={`mt-3 p-3 rounded border text-sm ${
                                        testResult.ok
                                            ? "bg-green-50 border-green-200 text-green-900"
                                            : "bg-red-50 border-red-200 text-red-900"
                                    }`}
                                >
                                    <strong>
                                        {testResult.ok ? "Gateway accepted" : "Gateway error"}
                                    </strong>
                                    <p className="mt-1">{testResult.message}</p>
                                    {testResult.upstream !== undefined && (
                                        <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
{typeof testResult.upstream === "string"
    ? testResult.upstream
    : JSON.stringify(testResult.upstream, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default SmsProvider;
