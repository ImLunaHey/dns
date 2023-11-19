import { GlowingSquares } from '@/glowing-squares';
import { Stats } from '@/stats';
import { Suspense } from 'react';

export default async function Home() {
  return (
    <main className="h-[100dvh] w-[100dvw] items-center justify-center font-mono font-sm bg-black text-white">
      <GlowingSquares />
      <Suspense fallback={<div>Loading...</div>}>
        <Stats />
      </Suspense>
    </main>
  );
}
