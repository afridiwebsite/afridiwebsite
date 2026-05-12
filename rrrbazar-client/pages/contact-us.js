import { AiOutlineYoutube } from 'react-icons/ai';

import Link from 'next/link';
import { globalContext } from './_app';
import { useContext } from 'react';
import {
  __whatsapp_support_number_link,
  __support_number,
  __facebook_link,
  __youtube_link
} from '../config/globalConfig';

import { TiSocialFacebook, TiSocialYoutube } from 'react-icons/ti';
function ContactUsPage() {
  const { isAuth } = useContext(globalContext);

  return (
    <section className="my-7 flex-grow flex flex-col justify-center px-4 lg:px-0">
      <div className="w-full lg:w-[1000px] xl:w-[1150px] grid grid-cols-1 md:grid-cols-[350px,auto] xl:grid-cols-[450px,auto] mx-auto bg-primary-900 py-7 pb-0.5 px-0.5 md:px-8 md:py-9 rounded-md space-y-6 md:space-y-0">
        <div className="px-6 mx-auto md:px-0">
          <h1 className="_h1 text-3xl md:text-4xl text-white">Contact Us</h1>

          <div className="mt-12">
            <a
              target="_blank"
              rel="noreferrer"
              href={__whatsapp_support_number_link}
              className="bg-yellow-500 hover:bg-blue-700 block text-white font-bold py-2 px-4 rounded"
            >
              Live Chat
            </a>

            <Link href={isAuth ? '/add-money' : '/login'}>
              <a className="bg-yellow-500 hover:bg-blue-700 block mt-4 text-white font-bold py-2 px-4 rounded">
                {isAuth ? 'Call Us' : 'Login to Call'}
              </a>
            </Link>
          </div>

          <div className="mt-10 flex items-center space-x-4">
            <ContactSocial
              Link={__facebook_link}
              IconRef={TiSocialFacebook}
            />

            <ContactSocial
              Link={__youtube_link}
              IconRef={TiSocialYoutube}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactUsPage;

const ContactIconList = ({ IconRef, text, link = '#', size }) => {
  return (
    <div>
      <a
        href={link}
        className="flex items-center p-3 rounded-md cursor-pointer border-[3px] border-transparent hover:border-primary-500 duration-150 space-x-4"
      >
        <div className="flex-shrink-0">
          <IconRef className="text-primary-500" size={size || 25} />
        </div>
        <p className="_subtitle1 font-medium text-white/90">{text}</p>
      </a>
    </div>
  );
};

const ContactSocial = ({ IconRef, Link }) => {
  return (
    <a
      href={Link}
      className="w-12 h-12 rounded-full overflow-hidden _flex_center hover:bg-primary-500 p-3 duration-150"
    >
      <IconRef className="w-full h-full text-white/80 duration-150 hover:text-white" />
    </a>
  );
};
