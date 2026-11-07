/** Імітація @vercel/blob: фото зберігаються в пам’яті й віддаються з /_local-blob/. */
export const files = (globalThis.__localBlobFiles ||= new Map());

export async function put(pathname, body, { contentType } = {}) {
  const name = pathname.replace(/\.(\w+)$/, `-${Math.random().toString(36).slice(2, 8)}.$1`);
  files.set(name, { body: Buffer.from(body), contentType });
  return { url: `/_local-blob/${name}`, pathname: name };
}

export async function del(urls) {
  for (const url of [].concat(urls)) files.delete(String(url).replace("/_local-blob/", ""));
}
