import { useState } from "react";
import '../collapse.scss';

function Collapsible({ header, children }) {
  const [open, setOpen] = useState(false);
  const toggleCollapseHandler = () => {
    setOpen((prevState) => !prevState);
  };
  return (
    <div>
      {/* Collapse Header ----Start---- */}
      <div onClick={toggleCollapseHandler} className="_s_collapse_header">
        <p>{header}</p>
        <div className={`_s_collapse_chevron ${open ? '_s_rotate_chevron' : ''}`}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
      {/* Collapse Header ----End---- */}

      {/* Collapse Body ----Start---- */}
      <div style={{ display: open ? "block" : "none" }}>{children}</div>
      {/* Collapse Body ----End---- */}
    </div>
  );
}

export default Collapsible;
