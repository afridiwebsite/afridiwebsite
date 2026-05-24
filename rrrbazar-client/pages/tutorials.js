import Head from 'next/head';
import { useState } from 'react';
import ReactHtmlParser from 'react-html-parser';
import { useQuery } from 'react-query';
import { FaPlayCircle } from 'react-icons/fa';
import { getTutorials } from '../api/api';
import ActivityIndicator from '../components/ActivityIndicator';
import { __page_title_end } from '../config/globalConfig';
import reactQueryConfig from '../config/reactQueryConfig';
import { hasData } from '../helpers/helpers';

// Pull a YouTube video id out of any of the common URL shapes:
//   https://www.youtube.com/watch?v=ID
//   https://youtu.be/ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/shorts/ID
// Returns null when the URL isn't a recognised YouTube link.
function extractYouTubeId(url) {
  if (!url) return null;
  const s = String(url).trim();
  // youtu.be short links
  let m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  // /watch?v=
  m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  // /embed/ID or /shorts/ID
  m = s.match(/youtube\.com\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return null;
}

function TutorialThumb({ videoLink }) {
  const youtubeId = extractYouTubeId(videoLink);
  // hqdefault is the most reliably available thumbnail for any uploaded
  // video (maxres can 404 on older or unlisted clips). Fall back to the
  // gradient + play-icon hero when extraction fails or the image errors.
  const [thumbFailed, setThumbFailed] = useState(false);
  if (youtubeId && !thumbFailed) {
    return (
      <div className="tutorial-card-thumb tutorial-card-thumb--img">
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          className="tutorial-card-thumb-img"
          loading="lazy"
          onError={() => setThumbFailed(true)}
        />
        <span className="tutorial-card-thumb-overlay">
          <FaPlayCircle className="tutorial-card-play" />
        </span>
      </div>
    );
  }
  return (
    <div className="tutorial-card-thumb">
      <FaPlayCircle className="tutorial-card-play" />
    </div>
  );
}

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
                <TutorialThumb videoLink={t.video_link} />
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
