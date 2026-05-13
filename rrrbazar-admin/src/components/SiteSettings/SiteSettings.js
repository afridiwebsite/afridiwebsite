import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../common/axios'
import useGet from '../../hooks/useGet'
import useUpload from '../../hooks/useUpload'
import { getErrors, toastDefault } from '../../utils/handler.utils'
import Loader from '../Loader/Loader'

function SiteSettings() {
    const [refresh, setRefresh] = useState(false)
    const [data, loading] = useGet('admin/site-settings', '', refresh)

    const site_name = useRef(null)
    const primary_color = useRef(null)
    const secondary_color = useRef(null)
    const accent_color = useRef(null)
    const coin_to_money_rate = useRef(null)
    const daily_claim_amount = useRef(null)
    const daily_claim_interval_hours = useRef(null)
    const dayRewardRefs = [
        useRef(null), useRef(null), useRef(null), useRef(null),
        useRef(null), useRef(null), useRef(null),
    ]

    const [logoFile, setLogoFile] = useState(null)
    const { path: uploadedLogo, uploading } = useUpload(logoFile)
    const [savedLogo, setSavedLogo] = useState('')

    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (data) setSavedLogo(data.logo || '')
    }, [data])

    const submit = (e) => {
        e.preventDefault()
        if (uploading) return
        setBusy(true)
        const payload = {
            site_name: site_name.current.value,
            logo: uploadedLogo || savedLogo,
            primary_color: primary_color.current.value,
            secondary_color: secondary_color.current.value,
            accent_color: accent_color.current.value,
            coin_to_money_rate: parseFloat(coin_to_money_rate.current.value || 0),
            daily_claim_amount: parseInt(daily_claim_amount.current.value || 0, 10),
            daily_claim_interval_hours: parseInt(daily_claim_interval_hours.current.value || 24, 10),
            day_1_reward: parseInt(dayRewardRefs[0].current?.value || 0, 10),
            day_2_reward: parseInt(dayRewardRefs[1].current?.value || 0, 10),
            day_3_reward: parseInt(dayRewardRefs[2].current?.value || 0, 10),
            day_4_reward: parseInt(dayRewardRefs[3].current?.value || 0, 10),
            day_5_reward: parseInt(dayRewardRefs[4].current?.value || 0, 10),
            day_6_reward: parseInt(dayRewardRefs[5].current?.value || 0, 10),
            day_7_reward: parseInt(dayRewardRefs[6].current?.value || 0, 10),
        }
        axiosInstance
            .post('/admin/site-settings/update', payload)
            .then(() => {
                toast.success('Settings updated', toastDefault)
                setRefresh((p) => !p)
            })
            .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
            .finally(() => setBusy(false))
    }

    return (
        <section className="relative container_admin">
            <div className="bg-white overflow-hidden rounded">
                <div className="px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black">Site Settings</h3>
                </div>
                <div className="py-8 px-4">
                    <div className="w-full md:w-[70%] mx-auto relative border border-gray-200 px-4 py-6 rounded">
                        {(loading || busy) && <Loader absolute />}
                        {data && (
                            <form onSubmit={submit}>
                                <div className="form_grid">
                                    <div>
                                        <label>Site name</label>
                                        <input ref={site_name} defaultValue={data.site_name} className="form_input" required />
                                    </div>
                                    <div>
                                        <label>Logo (uploaded image)</label>
                                        <input
                                            type="file"
                                            className="form_input"
                                            onChange={(e) => setLogoFile(e.target.files[0])}
                                        />
                                        {(uploadedLogo || data.logo) && (
                                            <img
                                                alt="logo preview"
                                                src={data.logo_full_url || ''}
                                                style={{ maxHeight: 60, marginTop: 8 }}
                                            />
                                        )}
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Theme colors</h4>
                                <div className="form_grid">
                                    <div>
                                        <label>Primary</label>
                                        <input ref={primary_color} defaultValue={data.primary_color} type="color" className="form_input h-12" />
                                    </div>
                                    <div>
                                        <label>Secondary</label>
                                        <input ref={secondary_color} defaultValue={data.secondary_color} type="color" className="form_input h-12" />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label>Accent</label>
                                        <input ref={accent_color} defaultValue={data.accent_color} type="color" className="form_input h-12" />
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Coin system</h4>
                                <div className="form_grid">
                                    <div>
                                        <label>Coin to money rate (1 coin = X BDT)</label>
                                        <input ref={coin_to_money_rate} defaultValue={data.coin_to_money_rate} type="number" step="0.0001" min="0" className="form_input" required />
                                    </div>
                                    <div>
                                        <label>Daily claim amount</label>
                                        <input ref={daily_claim_amount} defaultValue={data.daily_claim_amount} type="number" min="0" className="form_input" required />
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label>Claim interval (hours)</label>
                                        <input ref={daily_claim_interval_hours} defaultValue={data.daily_claim_interval_hours} type="number" min="1" className="form_input" required />
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Daily streak rewards</h4>
                                <p className="text-sm text-gray-500 mb-3">
                                    Coin amount awarded for each day of the 7-day login streak.
                                    Resets to Day 1 if the user misses a day.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7].map((d, i) => (
                                        <div key={d}>
                                            <label className="text-xs">Day {d}</label>
                                            <input
                                                ref={dayRewardRefs[i]}
                                                defaultValue={data[`day_${d}_reward`] ?? (d * 2)}
                                                type="number"
                                                min="0"
                                                className="form_input"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6">
                                    <button type="submit" disabled={uploading || busy} className="cstm_btn w-full block">
                                        Save settings
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SiteSettings
