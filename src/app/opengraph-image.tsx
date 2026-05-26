import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export const alt = '주디의 놀이터 · 신검단중앙역 칸타빌 더 스위트';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const OG_TEXT = ['Cantavil', '신검단중앙역 칸타빌 더 스위트', '주디의 놀이터'].join(' ');
const TEAL = '#22a497';

async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url =
    'https://fonts.googleapis.com/css2?' +
    `family=${encodeURIComponent(family)}:wght@${weight}` +
    `&text=${encodeURIComponent(text)}`;
  const css = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:30.0) Gecko/20100101 Firefox/30.0',
    },
  }).then((r) => r.text());
  const m = /url\((https:[^)]+)\)\s+format\(['"](?:woff|truetype|opentype)['"]\)/i.exec(css);
  if (!m) throw new Error(`font URL not found for ${family} ${weight}`);
  const fontRes = await fetch(m[1]);
  if (!fontRes.ok) throw new Error(`font fetch failed: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

async function loadAsset(rel: string, mime: string): Promise<string> {
  const buf = await readFile(path.join(process.cwd(), 'public', rel));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export default async function OpengraphImage() {
  const [bold, zudy] = await Promise.all([
    loadGoogleFont('Noto Sans KR', 700, OG_TEXT),
    loadAsset('zudy.png', 'image/png'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: 'Noto',
          background: TEAL,
        }}
      >
        {/* LEFT — text column */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '72px 0 72px 80px',
            width: 720,
          }}
        >
          {/* Cantavil mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 44, height: 56 }}>
              <div style={{ flex: '0 0 11.2px', background: '#ffffff', display: 'flex' }} />
              <div style={{ flex: '0 0 11.2px', display: 'flex' }} />
              <div style={{ flex: '0 0 5.6px', background: '#ffffff', display: 'flex' }} />
              <div style={{ flex: '0 0 11.2px', display: 'flex' }} />
              <div style={{ flex: '0 0 16.8px', background: '#ffffff', display: 'flex' }} />
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 8,
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              Cantavil
            </div>
          </div>

          <div
            style={{
              fontSize: 156,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: -4,
              textShadow: '0 6px 28px rgba(0,0,0,0.20)',
            }}
          >
            주디의
          </div>
          <div
            style={{
              fontSize: 156,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: -4,
              textShadow: '0 6px 28px rgba(0,0,0,0.20)',
              marginTop: 8,
            }}
          >
            놀이터
          </div>

          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.85)',
              marginTop: 28,
              letterSpacing: 0.5,
            }}
          >
            신검단중앙역 칸타빌 더 스위트
          </div>
        </div>

        {/* RIGHT — character. The zudy source has a white strip + a red dot at the
            very top; we crop it via an overflow:hidden frame and an oversized
            image that's shifted up, so only the character + teal area is visible. */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              width: 460,
              height: 500,
              overflow: 'hidden',
              background: TEAL,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zudy}
              alt=""
              style={{
                position: 'absolute',
                top: '-15%',
                left: '0',
                width: '100%',
                height: '115%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Noto', data: bold, weight: 700, style: 'normal' }],
    },
  );
}
