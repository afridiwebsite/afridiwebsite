import { useState } from "react"
import SelectPhone from "./SelectPhone"
import TypeSmsMessage from "./TypeSmsMessage"

function SendSms() {
    const [selectPhoneView, setSelectPhoneView] = useState(true)
    const [typeMessageView, setTypeMessageView] = useState(false)

    const [phones, setPhones] = useState([])

    const onGoSecondStep = (phones) => {
        setSelectPhoneView(false)
        setTypeMessageView(true)

        setPhones(phones)
    }

    const goBack = () => {
        setSelectPhoneView(true)
        setTypeMessageView(false)
    }

    const resetView = () => {
        setSelectPhoneView(true)
        setTypeMessageView(false)
    }



    return (
        <section className="relative container_admin" >
            <div className="bg-gray-100 overflow-hidden rounded">
                <div className="px-6 py-3 border-b bg-white flex flex-wrap items-center">
                    <h3 className="text-lg font-bold text-black mb-4 md:mb-0">
                        Send Sms
                    </h3>
                </div>

                {/* User list for select */}
                <div className="w-[60%] mx-auto bg-white my-6 rounded-md overflow-hidden" >
                    <SelectPhone isShow={selectPhoneView} onGoSecondStep={onGoSecondStep} />
                    <TypeSmsMessage resetView={resetView} phones={phones} goBack={goBack} isShow={typeMessageView} />
                </div>
            </div>
        </section>
    )
}

export default SendSms
