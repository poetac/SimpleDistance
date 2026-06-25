// Deterministic seed data reproducing the headline scenario:
//   5-iron carries SHORT of expectation, while 6-iron and 7-iron carry LONG.
// Spread across two independent sessions so the trend classifier can confirm it
// as real (not noise). 5-iron ball speed is kept in line with neighbors but its
// spin runs high — the equipment-vs-swing hint should lean "loft/spin check".
//
// Pure & seeded (mulberry32) so tests can assert exact behavior.

import type { Shot } from "../domain/types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal sample from a uniform generator. */
function normal(rng: () => number, meanV: number, sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return meanV + z * sd;
}

interface ClubProfile {
  club: string;
  carry: number;
  carrySd: number;
  ballSpeed: number;
  clubSpeed: number;
  spin: number;
  launch: number;
  n: number;
}

// Healthy expectations for this golfer. The 5I/6I/7I lines below override these
// with the anomaly. Carries are in yards, speeds in mph.
const BAG: ClubProfile[] = [
  { club: "DR", carry: 268, carrySd: 9, ballSpeed: 162, clubSpeed: 110, spin: 2600, launch: 13.5, n: 14 },
  { club: "3W", carry: 238, carrySd: 8, ballSpeed: 152, clubSpeed: 104, spin: 3200, launch: 12.0, n: 12 },
  { club: "4I", carry: 193, carrySd: 6, ballSpeed: 124, clubSpeed: 89, spin: 4900, launch: 14.5, n: 13 },
  // --- The anomaly: 5I is ~17 yds short of its ~183 expectation ---
  { club: "5I", carry: 166, carrySd: 6, ballSpeed: 120, clubSpeed: 86, spin: 6500, launch: 17.5, n: 16 },
  // --- 6I & 7I carry a touch LONG of expectation ---
  { club: "6I", carry: 178, carrySd: 6, ballSpeed: 117, clubSpeed: 84, spin: 5500, launch: 16.0, n: 15 },
  { club: "7I", carry: 168, carrySd: 6, ballSpeed: 113, clubSpeed: 81, spin: 6000, launch: 17.5, n: 15 },
  { club: "8I", carry: 150, carrySd: 5, ballSpeed: 108, clubSpeed: 78, spin: 6800, launch: 19.0, n: 12 },
  { club: "9I", carry: 138, carrySd: 5, ballSpeed: 103, clubSpeed: 75, spin: 7400, launch: 21.0, n: 11 },
  { club: "PW", carry: 126, carrySd: 5, ballSpeed: 98, clubSpeed: 72, spin: 8200, launch: 23.0, n: 10 },
  { club: "52", carry: 108, carrySd: 5, ballSpeed: 90, clubSpeed: 68, spin: 8800, launch: 25.0, n: 9 },
  { club: "56", carry: 92, carrySd: 5, ballSpeed: 82, clubSpeed: 64, spin: 9500, launch: 27.0, n: 8 },
  { club: "60", carry: 74, carrySd: 5, ballSpeed: 72, clubSpeed: 58, spin: 10200, launch: 30.0, n: 7 },
];

const SESSIONS = ["2026-05-18", "2026-06-08"];

/**
 * Generate the deterministic seed dataset.
 * @param seed RNG seed (default fixed for reproducibility).
 */
export function generateSeedShots(seed = 1337): Shot[] {
  const rng = mulberry32(seed);
  const shots: Shot[] = [];
  let id = 0;

  SESSIONS.forEach((sessionId, sIdx) => {
    for (const p of BAG) {
      // Slight session-to-session offset, but the 5I stays short in both.
      const sessionBias = sIdx === 0 ? 0 : normal(rng, 0, 1.2);
      const nShots = Math.max(7, Math.round(p.n * (sIdx === 0 ? 1 : 0.85)));
      for (let i = 0; i < nShots; i++) {
        const carry = normal(rng, p.carry + sessionBias, p.carrySd);
        const ballSpeed = normal(rng, p.ballSpeed, 1.5);
        const clubSpeed = normal(rng, p.clubSpeed, 1.2);
        const spin = normal(rng, p.spin, 350);
        const launch = normal(rng, p.launch, 1.0);
        const side = normal(rng, 0, 6);
        id += 1;
        shots.push({
          id: `seed-${id}`,
          club: p.club,
          rawClub: p.club,
          sessionId,
          timestamp: `${sessionId}T1${sIdx}:0${i % 6}:00`,
          carryYards: round1(carry),
          totalYards: round1(carry + normal(rng, p.club === "DR" ? 22 : 6, 2)),
          ballSpeedMph: round1(ballSpeed),
          clubSpeedMph: round1(clubSpeed),
          smashFactor: round2(ballSpeed / clubSpeed),
          spinRpm: Math.round(spin),
          launchAngleDeg: round1(launch),
          launchDirectionDeg: round1(normal(rng, 0, 2)),
          sideYards: round1(side),
          apexFt: Math.round(normal(rng, 90 + p.launch * 1.5, 8)),
          descentAngleDeg: round1(normal(rng, p.launch + 30, 2)),
          // Club-delivery metrics. Driver attacks up; irons/wedges down. A mild
          // in-to-out path with the face slightly closed to path -> gentle draw.
          attackAngleDeg: round1(normal(rng, p.club === "DR" ? 2.5 : -4, 1)),
          clubPathDeg: round1(normal(rng, 1.5, 1.2)),
          faceAngleDeg: round1(normal(rng, 0.6, 1.2)),
          sideSpinRpm: Math.round(normal(rng, -350, 300)),
          source: "seed",
        });
      }
    }
  });

  return shots;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
