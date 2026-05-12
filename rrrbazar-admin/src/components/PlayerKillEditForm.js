import { useState } from "react";
import { BsCheck } from "react-icons/bs";
import { toast } from "react-toastify";
import axiosInstance from "../common/axios";
import { getErrors, toastDefault } from "../utils/handler.utils";
import Button from "./Button";

function PlayerKillEditForm(e) {
    console.log("Event fire 11")
    const [kills, setKills] = useState(e.value || 0)
    const [isSaved, setIsSaved] = useState(true)
    const onChangeHandler = (e) => {
        if (isNaN(e.target.value)) return;
        setIsSaved(false)
        setKills(e.target.value)
    }

    const rowId = e?.row?.original?.id



    const submitHandler = (e) => {
        e.preventDefault();
        if (!kills) return;

        toast.promise(
            axiosInstance.post(`/admin/tournament/update-kills/${rowId}`, {
                kills,
            }),
            {
                pending: 'Updating player kills...',
                error: {
                    render(err) {
                        console.log(err);
                        return getErrors(err.data, true)[0]
                    }
                },
                success: {
                    render() {
                        setIsSaved(true)
                        return 'Player kills updated successfully'
                    }
                }
            },
            toastDefault
        )
    }

    return (
        <form onSubmit={submitHandler} className="space-x-1.5" >
            <input type="text" className="bg-transparent w-[60px] outline-none border border-transparent hover:border-gray-400 focus:border-gray-500" value={kills} onChange={onChangeHandler} />
            {!isSaved && <Button varient="primary" type="submit" className="!py-1" rounded="full" size="small" startIcon={<BsCheck />} />}
        </form>
    )
}

export default PlayerKillEditForm
