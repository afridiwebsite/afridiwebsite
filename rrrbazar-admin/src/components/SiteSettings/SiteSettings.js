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
    const dayRewardRefs = [
        useRef(null), useRef(null), useRef(null), useRef(null),
        useRef(null), useRef(null), useRef(null),
    ]
    const spin_cost_coins = useRef(null)
    const spin_daily_limit = useRef(null)
    const support_email = useRef(null)
    const telegram_number = useRef(null)
    const telegram_support_number = useRef(null)
    const youtube_link = useRef(null)

    const [logoFile, setLogoFile] = useState(null)
    const { path: uploadedLogo, uploading } = useUpload(logoFile)
    const [savedLogo, setSavedLogo] = useState('')

    const [busy, setBusy] = useState(false)

    // State for local color values to allow syncing text input and color picker
    const [colors, setColors] = useState({
        primary: '',
        secondary: '',
        accent: ''
    })

    useEffect(() => {
        if (data) {
            setSavedLogo(data.logo || '')
            setColors({
                primary: data.primary_color || '#2563eb',
                secondary: data.secondary_color || '#1e40af',
                accent: data.accent_color || '#f59e0b'
            })
        }
    }, [data])

    const handleColorChange = (key, val) => {
        setColors(prev => ({ ...prev, [key]: val }))
    }

    const submit = (e) => {
        e.preventDefault()
        if (uploading) return
        setBusy(true)
        const payload = {
            site_name: site_name.current.value,
            logo: uploadedLogo || savedLogo,
            primary_color: colors.primary,
            secondary_color: colors.secondary,
            accent_color: colors.accent,
            coin_to_money_rate: parseFloat(coin_to_money_rate.current.value || 0),
            day_1_reward: parseInt(dayRewardRefs[0].current?.value || 0, 10),
            day_2_reward: parseInt(dayRewardRefs[1].current?.value || 0, 10),
            day_3_reward: parseInt(dayRewardRefs[2].current?.value || 0, 10),
            day_4_reward: parseInt(dayRewardRefs[3].current?.value || 0, 10),
            day_5_reward: parseInt(dayRewardRefs[4].current?.value || 0, 10),
            day_6_reward: parseInt(dayRewardRefs[5].current?.value || 0, 10),
            day_7_reward: parseInt(dayRewardRefs[6].current?.value || 0, 10),
            spin_cost_coins: parseInt(spin_cost_coins.current?.value || 0, 10),
            spin_daily_limit: parseInt(spin_daily_limit.current?.value || 0, 10),
            support_email: support_email.current?.value || '',
            telegram_number: telegram_number.current?.value || '',
            telegram_support_number: telegram_support_number.current?.value || '',
            youtube_link: youtube_link.current?.value || '',
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
                                        <div className="flex gap-2">
                                            <input 
                                                value={colors.primary} 
                                                onChange={(e) => handleColorChange('primary', e.target.value)} 
                                                type="color" 
                                                className="w-12 h-10 p-0 border-0 cursor-pointer" 
                                            />
                                            <input 
                                                value={colors.primary} 
                                                onChange={(e) => handleColorChange('primary', e.target.value)} 
                                                className="form_input flex-1" 
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label>Secondary</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={colors.secondary} 
                                                onChange={(e) => handleColorChange('secondary', e.target.value)} 
                                                type="color" 
                                                className="w-12 h-10 p-0 border-0 cursor-pointer" 
                                            />
                                            <input 
                                                value={colors.secondary} 
                                                onChange={(e) => handleColorChange('secondary', e.target.value)} 
                                                className="form_input flex-1" 
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label>Accent</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={colors.accent} 
                                                onChange={(e) => handleColorChange('accent', e.target.value)} 
                                                type="color" 
                                                className="w-12 h-10 p-0 border-0 cursor-pointer" 
                                            />
                                            <input 
                                                value={colors.accent} 
                                                onChange={(e) => handleColorChange('accent', e.target.value)} 
                                                className="form_input flex-1" 
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Coin system</h4>
                                <div className="form_grid">
                                    <div>
                                        <label>Coin to money rate (1 coin = X BDT)</label>
                                        <input ref={coin_to_money_rate} defaultValue={data.coin_to_money_rate} type="number" step="0.0001" min="0" className="form_input" required />
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Support contact</h4>
                          
                                <div className="form_grid">
                                    <div>
                                        <label>Support email</label>
                                        <input
                                            ref={support_email}
                                            defaultValue={data.support_email || ''}
                                            type="email"
                                            placeholder="support@example.com"
                                            className="form_input"
                                        />
                                    </div>
                                    <div>
                                        <label>Telegram group</label>
                                        <input
                                            ref={telegram_number}
                                            defaultValue={data.telegram_number || ''}
                                            type="text"
                                            placeholder="+8801234567890 or username"
                                            className="form_input"
                                        />
                                       
                                    </div>
                                </div>
                                <div className="form_grid">
                                    <div>
                                        <label>Telegram support</label>
                                        <input
                                            ref={telegram_support_number}
                                            defaultValue={data.telegram_support_number || ''}
                                            type="text"
                                            placeholder="+8801234567890 or username"
                                            className="form_input"
                                        />
                                        
                                    </div>
                                    <div>
                                        <label>YouTube channel link</label>
                                        <input
                                            ref={youtube_link}
                                            defaultValue={data.youtube_link || ''}
                                            type="url"
                                            placeholder="https://youtube.com/@yourchannel"
                                            className="form_input"
                                        />
                                    </div>
                                </div>

                                <h4 className="font-bold mt-6 mb-2">Spin wheel</h4>
                                <p className="text-sm text-gray-500 mb-3">
                                    Global spin settings. The wheel segments
                                    themselves are managed at{' '}
                                    <a href="/spin-rewards" className="text-blue-600 underline">
                                        Spin Rewards
                                    </a>.
                                </p>
                                <div className="form_grid">
                                    <div>
                                        <label>Cost per spin (coins)</label>
                                        <input
                                            ref={spin_cost_coins}
                                            defaultValue={data.spin_cost_coins ?? 0}
                                            type="number"
                                            min="0"
                                            className="form_input"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">0 = free</p>
                                    </div>
                                    <div>
                                        <label>Daily spin limit</label>
                                        <input
                                            ref={spin_daily_limit}
                                            defaultValue={data.spin_daily_limit ?? 0}
                                            type="number"
                                            min="0"
                                            className="form_input"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">0 = no limit</p>
                                    </div>
                                </div>

                                {/* <h4 className="font-bold mt-6 mb-2">Daily streak rewards</h4>
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
                                </div> */}

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
