import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const size = { width: 256, height: 256 };
export const contentType = 'image/png';

async function loadAsset(rel: string, mime: string): Promise<string> {
  const buf = await readFile(path.join(process.cwd(), 'public', rel));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export default async function Icon() {
  const zudy = await loadAsset('zudy.png', 'image/png');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#2BA08F',
          borderRadius: 56, // ~22% of 256 — rounded but not pill
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={zudy}
          alt=""
          style={{
            position: 'absolute',
            // The source has a white strip on top — push the image up so only
            // the teal area + character is visible inside the rounded square.
            top: '-16%',
            left: '0',
            width: '100%',
            height: '116%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    size,
  );
}
