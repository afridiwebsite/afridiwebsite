import { Line } from 'rc-progress';
function SendingScreen({ sendingStatus }) {
    return (
        <div className="py-8 px-4 flex items-center justify-center flex-col text-center">
            <h2 className="text-xl mb-5 text-gray-800 font-bold">Please dont't close this window.</h2>
            <div className="w-[70%] mx-auto flex items-center gap-3" >
                <Line percent={sendingStatus.parcent} strokeWidth="1.5" strokeColor="#0e62ff" trailWidth="1.5" />
                <span className="font-bold text-sm text-gray-800">{sendingStatus.parcent}%</span>
            </div>
            <p className="font-bold text-sm text-gray-800 mt-3" >{sendingStatus.sent}</p>
        </div>
    )
}

export default SendingScreen
