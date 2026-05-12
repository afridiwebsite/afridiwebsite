/*
 *
 * Title: [joinId]
 * Description: --
 * Author: Saymon
 * Date: 15 January 2022 (Saturday)
 *
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useMemo, useState } from 'react';
import parse from 'react-html-parser';
import { BsArrowLeftShort } from 'react-icons/bs';
import { useQuery } from 'react-query';
import * as Yup from 'yup';
import {
  getTournamentById,
  getTournamentParticipantsById,
  getTournamentUserJoinedAlready,
} from '../../../api/api';
import ActivityIndicator from '../../../components/ActivityIndicator';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import reactQueryConfig from '../../../config/reactQueryConfig';
import routes from '../../../config/routes';
import { hasData } from '../../../helpers/helpers';
import { globalContext } from '../../_app';

function TournamentDetails() {
  const [selectedPlayers, setSelectedPlayers] = useState(null);
  const [shouldGetParticipants, setShouldGetParticipants] = useState(false);
  const router = useRouter();

  const { isAuth } = useContext(globalContext);

  const userJoined = useQuery(
    'get-tournament-user-joined-already',
    getTournamentUserJoinedAlready,
    {
      ...reactQueryConfig,
      enabled: !!isAuth,
      initialData: [],
    }
  );

  const {
    data: roomDetails,
    isLoading: isRoomDetailsLoading,
    error: roomDetailsError,
  } = useQuery(
    `get-tournament-room-details-${router.query?.tournamentId}`,
    () => getTournamentRoomDetails(router.query?.tournamentId),
    {
      ...reactQueryConfig,
      enabled: isAuth ? !!isAuth : false,
      initialData: [],
    }
  );

  const participants = useQuery(
    `get-participants-${router.query?.tournamentId}`,
    () => getTournamentParticipantsById(router.query?.tournamentId),
    {
      ...reactQueryConfig,
      enabled: !!shouldGetParticipants,
    }
  );

  const { isLoading, data, isError, error } = useQuery(
    `get-tournamentby-id-${router.query?.tournamentId}`,
    () => getTournamentById(router.query.tournamentId),
    { ...reactQueryConfig, enabled: !!router.query.tournamentId }
  );
  const tournamentData = data?.tournament;
  const tournamentPrizes = data?.prizes;

  const playerArray =
    selectedPlayers &&
    [...new Array(parseInt(selectedPlayers)).keys()].map((e) => e + 1);

  const isDisabledJoinButton = !selectedPlayers;

  const formikOptions = useMemo(() => {
    let validationSchema = {
      players: Yup.string().required('Please select any player option').trim(),
    };

    let initialValues = {
      players: selectedPlayers,
    };
    playerArray &&
      playerArray.forEach((player) => {
        validationSchema = {
          ...validationSchema,
          ...{
            [`player${player}id`]: Yup.string()
              .required(`Player ${player} id is required`)
              .trim(),
          },
        };
        initialValues = {
          ...initialValues,
          ...{ [`player${player}id`]: '' },
        };
      });

    return {
      validationSchema: Yup.object().shape(validationSchema),
      initialValues,
    };
  }, [selectedPlayers]);

  const joinedAlready = userJoined?.data?.includes(tournamentData?.id);

  const spotLeft =
    userJoined?.data?.length < parseInt(tournamentData?.user_limit);

  return (
    <section className="md:my-7 md:container">
      <div className="md:w-[450px] md:mx-auto md:rounded-md overflow-hidden ring-1 ring-gray-200 relative">
        {/* Header */}
        <header className="py-2 px-2 flex items-center gap-1.5 absolute top-0 left-0 w-full z-10">
          <Button
            onClick={() => router.back()}
            StartIcon={<BsArrowLeftShort size={28} />}
            className="primary border-none large !bg-primary-500/50 hover:!bg-primary-500/70"
          />
        </header>
        {/* Body */}
        <ActivityIndicator
          data={tournamentData}
          loading={isLoading}
          error={isError && error}
        />
        {hasData(tournamentData, isLoading, isError) && (
          <div>
            <img
              src="/profile-banners/5.jpg"
              alt="Free fire"
              className="w-full h-auto"
            />
            <div className="px-5 py-2 pb-3 border-b border-gray-200">
              <div className="flex justify-between flex-nowrap mb-3">
                <h6 className="_h6">{tournamentData?.title}</h6>
                {!joinedAlready &&
                tournamentData.status === 'open' &&
                spotLeft > 0 ? (
                  <Link
                    href={`/${routes.joinTournament.name}/${tournamentData.id}`}
                  >
                    <a>
                      <Button className="small">Join</Button>
                    </a>
                  </Link>
                ) : (
                  <Button className="small text pointer-events-none">
                    {joinedAlready
                      ? 'Joined'
                      : spotLeft <= 0
                      ? 'Match Full'
                      : tournamentData?.status === 'running'
                      ? 'Running'
                      : tournamentData?.status === 'ended'
                      ? 'Ended'
                      : ''}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <DetailBox
                  title="Per Kill:"
                  subtitle={'৳ ' + tournamentData?.per_kill}
                />
                <DetailBox
                  title="Entry Fee:"
                  subtitle={'৳ ' + tournamentData?.entry_fee}
                />
                <DetailBox
                  title="Total Prize:"
                  subtitle={'৳ ' + tournamentData?.total_prize}
                />
                <DetailBox
                  title="Type:"
                  subtitle={
                    <span className="capitalize">{tournamentData?.type}</span>
                  }
                />
                <DetailBox
                  title="Version:"
                  subtitle={tournamentData?.version}
                />
                <DetailBox title="Map:" subtitle={tournamentData?.map} />
                <DetailBox
                  title="Status:"
                  subtitle={
                    <Badge
                      type={tournamentData?.status}
                      text={tournamentData?.status}
                      className="!text-xs !p-0 !bg-transparent !font-semibold"
                    />
                  }
                />
              </div>
            </div>
            <div className="px-5 py-3 border-b border-gray-200">
              <div className="mb-3">
                <h6 className="_h6 !text-base">Prize Details</h6>
                <div className="mt-1.5 py-2 rounded text-sm leading-6">
                  <table className="w-full border-collapse text-center">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1">#</th>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentPrizes.map((prize) => (
                        <tr key={prize.id}>
                          <td className="px-2 py-1">{prize.place}</td>
                          <td className="px-2 py-1">{parse(prize.name)}</td>
                          <td className="px-2 py-1">৳ {prize.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {tournamentData?.live_link && (
              <div className="px-5 py-3 border-b border-gray-200">
                <h6 className="_h6 !text-base">Live link</h6>
                <div className="space-y-1 mt-1.5">
                  <a
                    href={tournamentData?.live_link}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Click Here
                  </a>
                </div>
              </div>
            )}
            <div className="px-5 py-3 border-b border-gray-200">
              <h6 className="_h6 !text-base">Room Details</h6>
              <div className="space-y-1 mt-1.5">
                {isRoomDetailsLoading
                  ? 'Loading...'
                  : roomDetailsError
                  ? 'Plase join first'
                  : roomDetails}
              </div>
            </div>
            <div className="px-5 py-3 border-b border-gray-200">
              <h6 className="_h6 !text-base">Match Instruction and Rules</h6>
              <div className="space-y-1 mt-1.5">
                {parse(tournamentData?.rules)}
              </div>
            </div>
            <div className="px-5 py-3">
              <h6 className="_h6 !text-base">Registered Participants</h6>
              {!hasData(participants?.data) && (
                <Button
                  className="small primary uppercase mt-2"
                  loading={participants.isLoading}
                  onClick={() => setShouldGetParticipants(true)}
                >
                  Load Participants
                </Button>
              )}
              {shouldGetParticipants && (
                <ActivityIndicator
                  data={participants.data}
                  loading={participants.isLoading}
                  error={participants.isError && participants.error}
                />
              )}
              {hasData(participants?.data) && (
                <div className="space-y-1 rounded overflow-hidden mt-2.5">
                  {participants.data.map((player, i) => (
                    <div
                      key={i}
                      className="_subtitle2 px-3 py-1 text-sm bg-gray-50/40 flex items-center justify-between flex-wrap gap-2"
                    >
                      <span>
                        {i + 1}. {player.game_name}
                      </span>
                      <span>{player?.kills || 0} kills </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// TournamentDetails.disabledHeader = true;
export default TournamentDetails;

const DetailBox = ({ title, subtitle }) => {
  return (
    <div className="px-2 py-1 text-center rounded overflow-hidden bg-gray-50 flex items-center gap-1.5 flex-nowrap">
      <p className="_subtitle1 !text-[11px] leading-3 mb-0.5">{title}</p>
      <p className="_h6 !text-xs">{subtitle}</p>
    </div>
  );
};
