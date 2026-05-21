import ReactHtmlParser from "react-html-parser";

// Standard HTML marquee replacement as requested.
// This replaces the custom CSS-based ticker for simplicity.
function MarqueeTicker({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <marquee
      className="home-notice-marquee"
      scrollamount="6"
      onMouseOver={(e) => e.target.stop()}
      onMouseOut={(e) => e.target.start()}
    >
      {items.map((m, idx) => (
        <span key={`${m.id}-${idx}`} className="home-notice-ticker-item">
          <span className="home-notice-ticker-text">
            {ReactHtmlParser(String(m.notice || ""))}
          </span>
          {idx < items.length - 1 && (
            <span className="home-notice-ticker-sep" aria-hidden="true">
              ✦
            </span>
          )}
        </span>
      ))}
    </marquee>
  );
}

export default MarqueeTicker;
