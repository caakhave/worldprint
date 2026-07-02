export const PLAY_LOBBY_REQUEST_EVENT = "canyougeo:play-lobby-request";

export function isMysteryMapPlayPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/play/mystery-map";
}

export function dispatchPlayLobbyRequest() {
  window.dispatchEvent(new CustomEvent(PLAY_LOBBY_REQUEST_EVENT));
}
