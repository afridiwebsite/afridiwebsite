import { useRef, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { toastDefault } from '../../utils/handler.utils';
import SendingScreen from "./SendingScreen";


function TypeSmsMessage({ isShow, goBack, phones, resetView }) {
    const messageRef = useRef(null)
    const [sending, setSending] = useState(false)
    const [sendingStatus, setSendingStatus] = useState({
        parcent: 0,
        sent: '-/-'
    })

    const sendHandler = async () => {
        const msg = messageRef.current.value?.trim()
        if (!msg) return;
        setSending(true)

        axiosInstance.post('/admin/send-sms', {
            phones,
            message: msg,
        }).then(res => {
            console.log(res.data)
            resetView()
            setSending(false)
            toast.success(`Message is sending to the server..`, toastDefault)
        }).catch(err => {
            resetView()
            toast.error(`Failed to send message`, toastDefault)
        })
    }

    return (
        <>
            <div style={{ display: isShow ? 'block' : 'none' }}>
                {sending ? (
                    <SendingScreen sendingStatus={sendingStatus} />
                ) : (
                    <>
                        <div className="px-4 py-2 font-bold border-b border-gray-200" >
                            Type Message
                        </div>
                        <div className="py-4 px-4">
                            <textarea rows="6" ref={messageRef} className="w-full resize-none form_input !mb-0" placeholder="Sms message"></textarea>
                        </div>
                        {/* Footer Start */}
                        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3" >
                            <button className="cstm_btn_small" onClick={goBack}>Back</button>
                            <button className="cstm_btn_small" onClick={sendHandler}>Send</button>
                        </div>
                        {/* Footer End */}
                    </>
                )}
            </div>
        </>
    )
}

export default TypeSmsMessage
