export class MultiplayerError extends Error {
  constructor(message, { code = 'multiplayer-error', status = 0, payload = null } = {}) {
    super(message);
    this.name = 'MultiplayerError';
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}
