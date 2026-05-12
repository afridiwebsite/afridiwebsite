/*
 *
 * Title: FlashMessage
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useEffect, useState } from 'react';
import { GrClose } from 'react-icons/gr';
import { toast } from 'react-toastify';
import Alert from '../components/Alert';
import { flash_message_key } from '../config/globalConfig';
import toastifyConfig from '../config/toastifyConfig';
import { getSession, removeSession } from '../lib/localStorage';
import Button from './Button';

function FlashMessage({
  className,
  showToast,
  messageKey,
  type = 'success',
  disabledCloseButton,
}) {
  const flashMsgKey = messageKey || flash_message_key;
  const [flashMessage, setFlashMessage] = useState(getSession(flashMsgKey));

  const removeFlashMsg = (hideAlert) => {
    removeSession(flashMsgKey);
    hideAlert && setFlashMessage(null);
  };

  setTimeout(() => {
    removeFlashMsg();
  }, 1500);

  useEffect(() => {
    if (showToast && flashMessage) {
      toast.success(flashMessage, toastifyConfig);
    }
  }, []);

  return (
    <>
      {flashMessage && !showToast ? (
        <div className={className || ''}>
          <Alert
            type={type}
            title={flashMessage}
            action={
              !disabledCloseButton && (
                <Button
                  onClick={() => removeFlashMsg(true)}
                  className="small green outlined"
                  StartIcon={<GrClose size={10} />}
                />
              )
            }
          />
        </div>
      ) : null}
    </>
  );
}

export default FlashMessage;
