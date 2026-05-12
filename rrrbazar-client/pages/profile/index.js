import Head from 'next/head';
import { useContext } from 'react';
import AuthGuard from '../../components/AuthGuard';
import ProfilePage from '../../components/Profile.page';
import { __page_title_end } from '../../config/globalConfig';
import { globalContext } from '../_app';

function Profile() {
  const ctx = useContext(globalContext);
  return (
    <>
      <Head>
        {ctx?.authUser && (
          <title>
            {ctx?.authUser?.username} {__page_title_end}
          </title>
        )}
      </Head>
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    </>
  );
}

export default Profile;
