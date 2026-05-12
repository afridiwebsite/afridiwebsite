import { useRouter } from 'next/router';
import { useState } from 'react';
import { BsArrowLeftShort } from 'react-icons/bs';
import { useQuery } from 'react-query';
import { getTournamentWinners } from '../../../api/api';
import ActivityIndicator from '../../../components/ActivityIndicator';
import Button from '../../../components/Button';
import reactQueryConfig from '../../../config/reactQueryConfig';
import { hasData } from '../../../helpers/helpers';

function WinnersPage() {
  const router = useRouter();
  const { data, isLoading, error, isError } = useQuery(
    'get-winners',
    () => getTournamentWinners(router.query.id),
    {
      ...reactQueryConfig,
      enabled: !!router.query.id,
    }
  );

  const calculateWinnerPrize = (player) => {
    const numberPlayerPlace = data?.winners.filter(
      (data) => data?.ranking == player?.ranking
    ).length;
    console.log('test 11');
    console.log(numberPlayerPlace);
    const prize = data?.prizes.find(
      (item) => item.place == player?.ranking
    ).amount;

    return prize / numberPlayerPlace;
  };

  return (
    <section className="md:my-7 md:container">
      <div className="md:w-[450px] md:mx-auto md:rounded-md overflow-hidden ring-1 ring-gray-200">
        {/* Header */}
        <header className="py-2 md:px-2 bg-primary-500 flex items-center gap-1.5">
          <Button
            onClick={() => router.back()}
            StartIcon={<BsArrowLeftShort size={28} />}
            className="primary border-none large"
          />
          <h4 className="_h5 text-white">
            Winners | {data?.tournament?.title}
          </h4>
        </header>
        <ActivityIndicator
          data={data}
          loading={isLoading}
          error={isError && error}
        />
        {/* Body Start */}
        <div className="p-3 space-y-1.5">
          {hasData(data?.winners) && (
            <>
              <table className="w-full border-collapse p-0 text-left">
                <thead className="text-gray-800 font-semibold">
                  <tr>
                    <th className="px-1 py-0.5">Player Name</th>
                    <th className="px-1 py-0.5">Kills</th>
                    <th className="px-1 py-0.5">Ranking</th>
                    <th className="px-1 py-0.5">Money</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.winners?.map((e, i) => (
                    <tr
                      className={'text-left border-2 font-normal text-gray-600'}
                      key={e.id}
                    >
                      <td className="px-1 py-0.5">{e?.game_name}</td>
                      <td className="px-1 py-0.5">{e?.kills || '0'}</td>
                      <td className="px-1 py-0.5">{e?.ranking || '---'}</td>
                      <td className="px-1 py-0.5">
                        {calculateWinnerPrize(e) || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        {/* Body End */}
      </div>

      <div className="md:w-[450px] md:mx-auto md:rounded-md overflow-hidden ring-1 ring-gray-200">
        <header className="py-2 md:px-2 bg-primary-500 flex items-center gap-1.5">
          <Button
            onClick={() => router.back()}
            StartIcon={<BsArrowLeftShort size={28} />}
            className="primary border-none large"
          />
          <h4 className="_h5 text-white">
            Kill Ranking | {data?.tournament?.title}
          </h4>
        </header>
        <div className="p-3 space-y-1.5">
          {hasData(data?.kill_ranking) && (
            <>
              <table className="w-full border-collapse p-0 text-left">
                <thead className="text-gray-800 font-semibold">
                  <tr>
                    <th className="px-1 py-0.5">Player Name</th>
                    <th className="px-1 py-0.5">Kills</th>
                    <th className="px-1 py-0.5">Money</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.kill_ranking?.map((e, i) => (
                    <tr
                      className={'text-left border-2 font-normal text-gray-600'}
                      key={e.id}
                    >
                      <td className="px-1 py-0.5">{e?.game_name}</td>
                      <td className="px-1 py-0.5">{e?.kills || '0'}</td>
                      <td className="px-1 py-0.5">
                        {data?.tournament?.per_kill * e?.kills || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default WinnersPage;
