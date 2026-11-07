/**
 * GET /api/data → спільні дані книги: додані страви, правки вбудованих, фото.
 */
import { handler, send } from "../lib/http.js";
import { loadShared } from "../lib/store.js";

export default handler(["GET"], async (req, res) => {
  send(res, 200, await loadShared());
});
