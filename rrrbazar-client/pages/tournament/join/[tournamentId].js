/*
 *
 * Title: [joinId]
 * Description: --
 * Author: Saymon
 * Date: 15 January 2022 (Saturday)
 *
 */

import { Formik } from 'formik';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo, useState } from 'react';
import { BsArrowLeftShort } from 'react-icons/bs';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import * as Yup from 'yup';
import api, {
  getTournamentById,
  getTournamentTotalJoined,
} from '../../../api/api';
import ActivityIndicator from '../../../components/ActivityIndicator';
import Alert from '../../../components/Alert';
import Button from '../../../components/Button';
import FormikErrorMessage from '../../../components/formik/FormikErrorMessage';
import FormikInput from '../../../components/formik/FormikInput';
import FormikRadio from '../../../components/formik/FormikRadio';
import reactQueryConfig from '../../../config/reactQueryConfig';
import toastifyConfig from '../../../config/toastifyConfig';
import { getErrors, hasData } from '../../../helpers/helpers';
import { globalContext } from '../../_app';

function JoinTournament() {
  const { authUser } = useContext(globalContext);
  const userWallet = authUser?.wallet;

  const router = useRouter();

  const { isLoading, data, isError, error } = useQuery(
    'get-tournamentby-id',
    () => getTournamentById(router.query.tournamentId),
    { ...reactQueryConfig, enabled: !!router.query.tournamentId }
  );

  const tournamentData = data?.tournament;

  const [selectedPlayers, setSelectedPlayers] = useState(null);

  useEffect(() => {
    tournamentData?.type === 'solo'
      ? setSelectedPlayers('1')
      : setSelectedPlayers(null);
  }, [tournamentData]);

  console.log({ selectedPlayers });
  const { data: spotLeftData } = useQuery(
    `total-joined-${tournamentData?.id}`,
    () => getTournamentTotalJoined(tournamentData?.id),
    {
      ...reactQueryConfig,
      initialData: 0,
      enabled: !!tournamentData,
    }
  );
  const spotLeft = tournamentData?.user_limit - spotLeftData || 0;

  const playerArray = useMemo(
    () =>
      selectedPlayers &&
      [...new Array(parseInt(selectedPlayers)).keys()].map((e) => e + 1),
    [selectedPlayers]
  );

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
  }, [selectedPlayers, playerArray]);

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
          <h4 className="_h5 text-white">Joining Match</h4>
        </header>
        {/* Body */}
        <ActivityIndicator
          data={tournamentData}
          loading={isLoading}
          error={isError && error}
        />
        {hasData(tournamentData, isLoading, isError) &&
        tournamentData?.status === 'open' &&
        spotLeft ? (
          <div>
            <div className="px-5 py-5 space-y-1.5 border-b border-gray-200">
              <Alert title="আপনার গেম আইডি লেভেল 40+ থাকতে হবে" />

              <h6 className="_h6">{tournamentData?.title}</h6>
              <p className="_subtitle1 small">
                Match entry fee per person:{' '}
                <span className="font-bold">৳{tournamentData?.entry_fee}</span>
              </p>
              <p className="_subtitle1 small">
                Team entry fee:{' '}
                <span className="font-bold">
                  ৳
                  {selectedPlayers
                    ? tournamentData?.entry_fee * parseInt(selectedPlayers)
                    : tournamentData?.entry_fee}
                </span>
              </p>
              <div className="!mt-3 pointer-events-none">
                <Button className="small">{spotLeft} spots left</Button>
              </div>
            </div>
            <div className="py-5 px-5">
              {tournamentData?.type === 'squad' && (
                <div className="space-y-1.5 mb-5">
                  <h6 className="_h6">Squad Registration</h6>
                  <p className="_subtitle1 small">
                    This is a Squad match, but you can join as Solo, Due or
                    Squad.
                  </p>
                </div>
              )}
              {/* Registration Form */}
              <div className="mt-2">
                <Formik
                  enableReinitialize
                  initialValues={formikOptions.initialValues}
                  validationSchema={formikOptions.validationSchema}
                  onSubmit={async (values, actions) => {
                    let isConfirmed = false;
                    Swal.fire({
                      title: false,
                      html: `
                            <div class="_confirm_order_body">
                              <h4 class="_h4">Confirm Order</h4>
                              <p className="modal_sub_title">Your current wallet is <span class="_bold_it">৳${userWallet}</span></p>
                              <p className="modal_sub_title">You need <span class="_bold_it">৳${
                                selectedPlayers
                                  ? tournamentData?.entry_fee *
                                    parseInt(selectedPlayers)
                                  : tournamentData?.entry_fee
                              }</span> to purchase this product.</p>
                            </div>`,
                      customClass: {
                        popup: '_confirm_order_modal_popup',
                        cancelButton: '_cancel_btn',
                        confirmButton: '_confirm_btn',
                      },
                      cancelButtonText: 'Cancel',
                      confirmButtonText: 'Confirm Join',
                      showCancelButton: true,
                      cancelButtonColor: 'red',
                    }).then(async (e) => {
                      if (e.isConfirmed && !isConfirmed) {
                        actions.setSubmitting(true);
                        isConfirmed = true;
                        try {
                          // Making players array
                          const playerNames = [
                            ...new Array(parseInt(values.players)).keys(),
                          ].map((player) => values[`player${player + 1}id`]);

                          const res = await api.post('/tournaments/join', {
                            number_of_player: parseInt(values.players),
                            game_name: playerNames,
                            tournament_id: router.query.tournamentId,
                          });

                          toast.success(
                            'Tournament successfully registered',
                            toastifyConfig
                          );
                          actions.resetForm();
                          router.back();
                        } catch (error) {
                          toast.error(getErrors(error), toastifyConfig);
                        } finally {
                          actions.setSubmitting(false);
                        }
                      } else {
                        isConfirmed = false;
                      }
                    });
                  }}
                >
                  {({ handleSubmit, handleChange, values, isSubmitting }) => (
                    <form onSubmit={handleSubmit}>
                      <div className="bg-gray-50 rounded-md p-3 px-4">
                        {(tournamentData?.type === 'duo' ||
                          tournamentData?.type === 'squad') && (
                          <div className="mb-3.5">
                            <h6 className="_h6 text-sm mb-1.5">
                              Select players
                            </h6>
                            <div className="flex items-center flex-wrap sm:flex-nowrap justify-between">
                              <FormikRadio
                                disabledErrorMessage
                                label="1 Player"
                                name="players"
                                className="w-full py-1.5"
                                value="1"
                                onChange={(e) => {
                                  setSelectedPlayers(e.target.value);
                                  handleChange('players')(e);
                                }}
                              />
                              <FormikRadio
                                disabledErrorMessage
                                label="2 Players"
                                name="players"
                                className="w-full py-1.5"
                                value="2"
                                onChange={(e) => {
                                  setSelectedPlayers(e.target.value);
                                  handleChange('players')(e);
                                }}
                              />
                              {tournamentData?.type === 'squad' && (
                                <FormikRadio
                                  disabledErrorMessage
                                  label="4 Players"
                                  name="players"
                                  className="w-full py-1.5"
                                  value="4"
                                  onChange={(e) => {
                                    setSelectedPlayers(e.target.value);
                                    handleChange('players')(e);
                                  }}
                                />
                              )}
                            </div>
                            <FormikErrorMessage name="players" />
                          </div>
                        )}

                        {selectedPlayers && values['players'] && (
                          <div
                            className={`${
                              selectedPlayers !== '1' ? '_grid_2 gap-3' : ''
                            }`}
                          >
                            {playerArray.map((player) => (
                              <FormikInput
                                key={player}
                                placeholder={`Player ${player} game name`}
                                name={`player${player}id`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        disabled={isDisabledJoinButton || isSubmitting}
                        type="submit"
                        className="w-full mt-4"
                        loading={isSubmitting}
                      >
                        Join
                      </Button>
                    </form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <Alert
              title={`${
                !spotLeft
                  ? 'No spot left to join this tournamnet'
                  : 'This tournament is not available at this moment'
              }`}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// JoinTournament.disabledHeader = true;
JoinTournament.auth = true;
export default JoinTournament;
