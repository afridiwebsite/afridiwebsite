import Head from 'next/head';
import ReactHtmlParser from 'react-html-parser';
import { useQuery } from 'react-query';
import { FaPlayCircle } from 'react-icons/fa';
import { getTutorials } from '../api/api';
import ActivityIndicator from '../components/ActivityIndicator';
import { __page_title_end } from '../config/globalConfig';
import reactQueryConfig from '../config/reactQueryConfig';
import { hasData } from '../helpers/helpers';

function TutorialsPage() {
  const {
    data: tutorials,
    isLoading,
    isError,
  } = useQuery('tutorials', getTutorials, reactQueryConfig);

  return (
    <>
      <Head>
        <title>Tutorials {__page_title_end}</title>
      </Head>

      <section className="container my-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="_h2 mb-2">Tutorials</h1>
          <p className="_body2 text-gray-500 max-w-xl mx-auto">
            Step-by-step video guides. Click a card to open the video in a new tab.
          </p>
        </div>

        <ActivityIndicator
          data={tutorials}
          error={isError}
          loading={isLoading}
        />

        {hasData(tutorials) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {tutorials.map((t) => (
              <a
                key={t.id}
                href={t.video_link || '#'}
                target="_blank"
                rel="noreferrer"
                className="group tutorial-card"
              >
                <div className="tutorial-card-thumb">
                  <FaPlayCircle className="tutorial-card-play" />
                </div>
                <div className="tutorial-card-body">
                  <h3 className="tutorial-card-title">{t.title || 'Untitled'}</h3>
                  {t.description && (
                    <div className="tutorial-card-desc">
                      {ReactHtmlParser(t.description)}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default TutorialsPage;
