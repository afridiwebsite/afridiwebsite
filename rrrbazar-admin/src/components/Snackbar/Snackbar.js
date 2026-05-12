import { useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import defaultSound from "../../assets/sound/pop_sound.mp3";
function Snackbar({
  open,
  animationIn,
  animationOut,
  stay,
  message,
  children,
  stayForEver,
  success,
  danger,
  warn,
  cross,
  top,
  left,
  right,
  bottom,
  className,
  sound,
}) {
  const [openClose, setOpenClose] = useState(false);
  const [animationIs, setAnimationIs] = useState("");
  useEffect(() => {
    const closeWithTransition = () => {
      setAnimationIs(`animate-${animationOut || "slideTop"}-out`);
      setTimeout(() => {
        setOpenClose(false);
      }, 240);
    };

    // Auto Close SnackBar After Assigned Time
    let vanishTimiOut = setTimeout(() => {
      closeWithTransition();
    }, stay || 5000);

    // Stay SnackBar Forever
    if (stayForEver) {
      clearTimeout(vanishTimiOut);
    }

    if (open || (open === undefined && message && typeof message == "string")) {
      // Show SnackBar
      setOpenClose(true);

      // Play Sound If Sound Exists
      sound &&
        setTimeout(() => {
          let getAudioElm = document.getElementById("pop_sound_audio");
          getAudioElm && getAudioElm?.play();
        }, 50);

      // Show SnackBar With Animation
      setAnimationIs(`animate-${animationIn || "slideBottom"}-in`);
    } else {
      closeWithTransition();
      clearTimeout(vanishTimiOut);
    }
  }, [open, animationIn, animationOut, stay, message, sound, stayForEver]);

  return (
    <>
      {openClose && (
        <div
          className={`fixed z-[2147483647] flex items-end text-gray-100 bg-gray-900 rounded py-2 max-w-[90%] sm:max-w-sm px-3 ${
            (top && left && "top-4 left-4") ||
            (top && right && "top-4 right-4") ||
            (bottom && left && "bottom-4 left-4") ||
            (bottom && right && "bottom-4 right-4") ||
            "bottom-4 left-4"
          } ${animationIs} ${success && "bg-[#08a723]"} ${
            danger && "bg-[#ff1414]"
          } ${warn && "bg-[#db8400]"} ${className && className}`}
        >
          <div className="flex items-center max-h-[90vh] w-full overflow-y-auto ">
            {children || (
              <p className="flex-grow">{message || "Please add some text."}</p>
            )}
            {cross && (
              <span
                className="float-right min-w-[24px] min-h-[24px] rounded-full overflow-hidden bg-[#ffffff2d] flex justify-center items-center self-center ml-3 cursor-pointer hover:bg-[#ffffff69] sticky top-0"
                onClick={() => {
                  setAnimationIs(`animate-${animationOut || "slideTop"}-out`);
                  setTimeout(() => {
                    setOpenClose(false);
                  }, 240);
                }}
              >
                <IoMdClose className="text-white" />
              </span>
            )}
          </div>
          {sound && (
            <audio
              id="pop_sound_audio"
              src={`${
                sound && typeof sound == "string" ? sound : defaultSound
              }`}
              className="hidden"
            ></audio>
          )}
        </div>
      )}
    </>
  );
}

export default Snackbar;
