/** Node-хук: підміняє @vercel/blob на імітацію в пам’яті для локального сервера. */
export async function resolve(specifier, context, next) {
  if (specifier === "@vercel/blob") return { url: new URL("./memory-blob.js", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
