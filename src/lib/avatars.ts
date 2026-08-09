export const AVATAR_EMOJI: Record<string, string> = {
  fox: "🦊",
  owl: "🦉",
  panda: "🐼",
  lion: "🦁",
  rabbit: "🐰",
  turtle: "🐢",
  whale: "🐳",
  dino: "🦕",
};

export function avatarEmoji(avatar: string): string {
  return AVATAR_EMOJI[avatar] ?? "🦊";
}
