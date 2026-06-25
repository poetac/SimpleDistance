// Canonical field definitions used by the column-mapping step.

export type CanonicalField =
  | "club"
  | "timestamp"
  | "sessionId"
  | "carryYards"
  | "totalYards"
  | "ballSpeedMph"
  | "clubSpeedMph"
  | "smashFactor"
  | "launchAngleDeg"
  | "spinRpm"
  | "launchDirectionDeg"
  | "sideYards"
  | "apexFt"
  | "descentAngleDeg"
  | "attackAngleDeg"
  | "clubPathDeg"
  | "faceAngleDeg"
  | "sideSpinRpm";

export interface CanonicalFieldDef {
  key: CanonicalField;
  label: string;
  /** Whether this field carries a distance (yards) or speed (mph) for unit handling. */
  kind: "club" | "time" | "session" | "distance" | "speed" | "smash" | "angle" | "spin";
  required?: boolean;
  /** Regex fragments used to auto-detect a matching source header. */
  detect: RegExp[];
}

export const CANONICAL_FIELDS: CanonicalFieldDef[] = [
  {
    key: "club",
    label: "Club",
    kind: "club",
    required: true,
    detect: [/\bclub\b/i, /\bclub\s*name\b/i, /\btype\b/i],
  },
  {
    key: "carryYards",
    label: "Carry distance",
    kind: "distance",
    required: true,
    // Exclude "Carry Side" (via lookahead) so it doesn't steal the side column.
    detect: [
      /\bcarry\s*(distance|dist|yds|yards|m)\b/i,
      /^carry(?!\s*side)/i,
      /\bcarry\b(?!\s*side)/i,
    ],
  },
  {
    key: "totalYards",
    label: "Total distance",
    kind: "distance",
    detect: [/\btotal\s*(distance|dist|yds|yards|m)\b/i, /^total/i, /\btotal\b/i],
  },
  {
    key: "timestamp",
    label: "Timestamp / date",
    kind: "time",
    detect: [/\bdate\b/i, /\btime\b/i, /timestamp/i],
  },
  {
    key: "sessionId",
    label: "Session id",
    kind: "session",
    detect: [/session/i, /\bbay\b/i, /\bround\b/i],
  },
  {
    key: "ballSpeedMph",
    label: "Ball speed",
    kind: "speed",
    detect: [/ball\s*speed/i, /\bball\s*vel/i],
  },
  {
    key: "clubSpeedMph",
    label: "Club speed",
    kind: "speed",
    detect: [/club\s*speed/i, /club\s*head\s*speed/i, /\bchs\b/i, /\bswing\s*speed\b/i],
  },
  {
    key: "smashFactor",
    label: "Smash factor",
    kind: "smash",
    detect: [/smash/i, /\befficiency\b/i],
  },
  {
    key: "launchAngleDeg",
    label: "Launch angle",
    kind: "angle",
    detect: [/launch\s*ang/i, /\blaunch\b(?!.*dir)/i, /\bvla\b/i],
  },
  {
    key: "spinRpm",
    label: "Spin rate",
    kind: "spin",
    detect: [/spin\s*rate/i, /back\s*spin/i, /total\s*spin/i, /\bspin\b(?!.*axis)/i],
  },
  {
    key: "launchDirectionDeg",
    label: "Launch direction",
    kind: "angle",
    detect: [/launch\s*dir/i, /\bhla\b/i, /\bazimuth\b/i, /^direction$/i],
  },
  {
    key: "sideYards",
    label: "Side / offline",
    kind: "distance",
    detect: [/\bcarry\s*side\b/i, /^side\b/i, /offline/i, /\blateral\b/i, /\bside\b/i],
  },
  {
    key: "apexFt",
    label: "Apex height",
    kind: "distance",
    detect: [/\bapex\b/i, /\bheight\b/i, /max\s*height/i],
  },
  {
    key: "descentAngleDeg",
    label: "Descent angle",
    kind: "angle",
    detect: [/descent/i, /land(ing)?\s*ang/i],
  },
  {
    key: "attackAngleDeg",
    label: "Angle of attack",
    kind: "angle",
    detect: [/attack\s*ang/i, /angle\s*of\s*attack/i, /\baoa\b/i, /\baib\b/i],
  },
  {
    key: "clubPathDeg",
    label: "Club path",
    kind: "angle",
    detect: [/club\s*path/i, /^path$/i, /\bswing\s*path\b/i],
  },
  {
    key: "faceAngleDeg",
    label: "Face angle",
    kind: "angle",
    detect: [/face\s*ang/i, /^face$/i, /face\s*to\s*target/i, /club\s*face/i],
  },
  {
    key: "sideSpinRpm",
    label: "Side spin",
    kind: "spin",
    detect: [/side\s*spin/i, /horizontal\s*spin/i],
  },
];

export const REQUIRED_FIELDS: CanonicalField[] = CANONICAL_FIELDS.filter(
  (f) => f.required,
).map((f) => f.key);
