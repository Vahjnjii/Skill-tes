/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Env {
  DB: KVNamespace;
  UPLOADS?: KVNamespace;
  UPLOADS_BUCKET?: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const fileName = params.file as string;

  if (!fileName) {
    return new Response('File name parameter missing', { status: 400 });
  }

  try {
    // 1. Try to serve from R2 Bucket
    if (env.UPLOADS_BUCKET) {
      const object = await env.UPLOADS_BUCKET.get(fileName);
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');
        return new Response(object.body, { headers });
      }
    }

    // 2. Try fallback to KV Namespace
    if (env.UPLOADS) {
      const fileBuffer = await env.UPLOADS.get(fileName, 'arrayBuffer');
      if (fileBuffer) {
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
    }

    return new Response('File Not Found', { status: 404 });
  } catch (err: any) {
    return new Response('Error retrieving file: ' + err.message, { status: 500 });
  }
};
