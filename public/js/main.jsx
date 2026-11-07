import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function Status() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = (event) => setMessage(event.detail);
    document.addEventListener("recipe-book:status", update);
    import("./main.js");
    return () => document.removeEventListener("recipe-book:status", update);
  }, []);

  return <p className="status" id="status" role="status">{message}</p>;
}

const root = import.meta.hot?.data.root || createRoot(document.getElementById("react-status"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<Status />);

if (import.meta.hot) import.meta.hot.dispose((data) => { data.root = root; });
