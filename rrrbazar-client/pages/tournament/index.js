import moment from 'moment';
import Link from 'next/link';
import { useContext, useState } from 'react';
import parser from 'react-html-parser';
import { BiKey } from 'react-icons/bi';
import { BsFillTrophyFill } from 'react-icons/bs';
import { IoCloseSharp } from 'react-icons/io5';
import { useQuery } from 'react-query';
import api, {
  getTournamentTotalJoined,
  getTournamentRoomDetails,
  getTournamentUserJoinedAlready,
} from '../../api/api';
import ActivityIndicator from '../../components/ActivityIndicator';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import reactQueryConfig from '../../config/reactQueryConfig';
import routes from '../../config/routes';
import { hasData, imgPath } from '../../helpers/helpers';
import { globalContext } from '../_app';

function TournamentPage({ tournaments }) {
  const { isAuth } = useContext(globalContext);

  const { data, isLoading } = useQuery(
    'get-tournament-user-joined-already',
    getTournamentUserJoinedAlready,
    {
      ...reactQueryConfig,
      enabled: !!isAuth,
      initialData: [],
    }
  );

  return (
    <section className="py-7 bg-gray-50/60 flex-grow">
      <div className="container">
        <h1 className="_section_title">Tournament</h1>
        {/* tournament grid start */}
        <ActivityIndicator data={tournaments?.tournaments} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasData(tournaments?.tournaments) &&
            tournaments.tournaments.map((tournaments) => (
              <Tournament
                key={tournaments.id}
                {...tournaments}
                joinedAlready={
                  Array.isArray(data) && data?.includes(tournaments.id)
                }
              />
            ))}
        </div>
        {/* tournament grid end */}
      </div>
    </section>
  );
}

export default TournamentPage;

export async function getServerSideProps(ctx) {
  let tournaments = null;

  // Fetching Topup Products
  try {
    const res = await api.get('/tournaments');
    tournaments = res?.data?.data;
  } catch (error) {
    tournaments = null;
  }
  return {
    props: {
      tournaments,
    },
  };
}

const Tournament = (e) => {
  const [showModal, setShowModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const { isAuth } = useContext(globalContext);

  const {
    data: roomDetails,
    isLoading,
    error,
  } = useQuery(
    `get-tournament-room-details-${e?.id}`,
    () => getTournamentRoomDetails(e?.id),
    {
      ...reactQueryConfig,
      enabled: isAuth ? !!isAuth : false,
      initialData: [],
    }
  );

  const closeModal = () => {
    setShowModal(false);
  };

  const { data } = useQuery(
    `total-joined-${e.id}`,
    () => getTournamentTotalJoined(e.id),
    {
      ...reactQueryConfig,
      initialData: 0,
    }
  );
  const spotLeft = e.user_limit - data;
  const spotLeftInPercentage = ((data / e.user_limit) * 100).toFixed(0);
  return (
    <div className="rounded-md bg-white">
      {/* Prize Popup Start */}
      {showModal && (
        <div className="_absolute_full fixed bg-black/70 z-[99999999999] _flex_center">
          <div className="relative w-full sm:w-auto _animate_slide_in">
            {/* Close Popup --Start-- */}
            <div
              onClick={() => closeModal()}
              className="w-8 h-8 rounded-full overflow-hidden absolute bottom-[calc(100%+6px)] right-[20px] sm:top-0 sm:left-full _flex_center bg-white sm:-translate-x-1/2 sm:-translate-y-1/2 p-1 border border-gray-200 cursor-pointer hover:scale-110 duration-100"
            >
              <IoCloseSharp className="w-full h-full" />
            </div>
            {/* Close Popup --End-- */}
            <div className="bg-white rounded-md overflow-hidden w-[92%] mx-auto sm:w-[300px]">
              <div className="bg-yellow-400 px-4 py-3 text-center">
                <h3 className="_h5 !text-black">Prize Pool</h3>
                <p className="_subtitle1 !text-sm">{e.title}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <table className="w-full border-collapse text-center">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1">#</th>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.TournamentPrizes.sort(
                      (a, b) => parseFloat(a.place) - parseFloat(b.place)
                    ).map((prize) => (
                      <tr key={prize.id}>
                        <td className="px-2 py-1">{prize.place}</td>
                        <td className="px-2 py-1">{parser(prize.name)}</td>
                        <td className="px-2 py-1">৳ {prize.amount}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1">Per Kill</td>
                      <td className="px-2 py-1">৳ {e?.per_kill}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1">Total Prize</td>
                      <td className="px-2 py-1">৳ {e?.total_prize}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Prize Popup End */}

      {/* Room Details --Start-- */}

      {showRoomDetailsModal && (
        <div className="_absolute_full fixed bg-black/70 z-[99999999999] _flex_center">
          <div className="relative w-full sm:w-auto _animate_slide_in">
            {/* Close Popup --Start-- */}
            <div
              onClick={() => setShowRoomDetailsModal(false)}
              className="w-8 h-8 rounded-full overflow-hidden absolute bottom-[calc(100%+6px)] right-[20px] sm:top-0 sm:left-full _flex_center bg-white sm:-translate-x-1/2 sm:-translate-y-1/2 p-1 border border-gray-200 cursor-pointer hover:scale-110 duration-100"
            >
              <IoCloseSharp className="w-full h-full" />
            </div>
            {/* Close Popup --End-- */}
            <div className="bg-white rounded-md overflow-hidden w-[92%] mx-auto sm:w-[300px]">
              <div className="bg-yellow-400 px-4 py-3 text-center">
                <h3 className="_h5 !text-black">Room Details</h3>
                <p className="_subtitle1 !text-sm">{e.title}</p>
              </div>
              <div className="px-4 py-4 text-center">
                {isLoading
                  ? 'Loading...'
                  : error
                  ? 'Please join first'
                  : roomDetails}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Details --End-- */}

      {/* Header */}
      <Link href={`/tournament/details/${e?.id}`}>
        <a>
          <div className="flex gap-4 p-3">
            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-200">
              <img src={imgPath(e.image)} alt="Free Fire" />
            </div>
            <div className="-mt-0.5">
              <h3 className="_h6 mb-0.5">{e.title}</h3>
              <p className="_subtitle1 !text-xs">
                Time: {moment(e.start_time).format('DD/MM/Y [at] hh:mm A')}
              </p>
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-3 border-[0.5px] border-gray-100/50">
            <DetailBox title="Per Kill" subtitle={'৳ ' + e.per_kill} />
            <DetailBox title="Entry Fee" subtitle={'৳ ' + e.entry_fee} />
            <DetailBox
              title="Type"
              subtitle={<span className="capitalize">{e.type}</span>}
            />
            <DetailBox title="Version" subtitle={e.version} />
            <DetailBox title="Map" subtitle={e.map} />
            <DetailBox
              title="Status"
              subtitle={
                <Badge
                  type={e.status}
                  text={e.status}
                  className="!text-xs !p-0 !bg-transparent !font-semibold"
                />
              }
            />
          </div>
        </a>
      </Link>
      {/* Join And Progresss */}
      {e.status !== 'ended' && (
        <div className="flex items-center gap-3 px-3 mt-3.5">
          <div className="w-full">
            {/* Progress Bar */}
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${spotLeftInPercentage}%`,
                }}
                className="h-full bg-primary-500"
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="_subtitle1 text-[10px] leading-3">
                Only {spotLeft} spots left
              </p>
              <p className="_subtitle1 text-[10px] leading-3">
                {data}/{e.user_limit}
              </p>
            </div>
          </div>
          <div className={`flex-shrink-0`}>
            {!e.joinedAlready && spotLeft !== 0 && e.status === 'open' ? (
              <Link href={`/${routes.joinTournament.name}/${e.id}`}>
                <a>
                  <Button
                    disabled={e.joinedAlready}
                    className="extra_small outlined"
                  >
                    Join
                  </Button>
                </a>
              </Link>
            ) : (
              <Button className="extra_small text pointer-events-none">
                {e.joinedAlready
                  ? 'Joined'
                  : spotLeft <= 0
                  ? 'Match Full'
                  : e.status === 'running'
                  ? 'Running'
                  : e.status === 'ended'
                  ? 'Ended'
                  : ''}
              </Button>
            )}
          </div>
        </div>
      )}
      {/* Footer */}
      <div className="mb-3 flex items-center gap-3 px-3 mt-3.5">
        {e.status === 'ended' ? (
          <Link href={`/${routes.tournament.name}/winners/${e.id}`}>
            <a className="flex-shrink-0">
              <Button
                className="extra_small outlined"
                StartIcon={<BsFillTrophyFill size={12} />}
              >
                Winner Details
              </Button>
            </a>
          </Link>
        ) : (
          <Button
            onClick={() => setShowRoomDetailsModal(true)}
            className="extra_small outlined w-full"
            StartIcon={<BiKey size={15} />}
          >
            Room Details
          </Button>
        )}
        <Button
          StartIcon={<BsFillTrophyFill size={12} />}
          className="extra_small outlined w-full"
          onClick={() => setShowModal(true)}
        >
          Prize Details
        </Button>
      </div>
    </div>
  );
};

const DetailBox = ({ title, subtitle }) => {
  return (
    <div className="p-1.5 border-[0.5px] border-gray-100/50 text-center">
      <p className="_subtitle1 !text-[10px] leading-3 mb-0.5">{title}</p>
      <p className="_h6 !text-xs">{subtitle}</p>
    </div>
  );
};
