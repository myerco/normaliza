import { MultiplayerError } from './errors.js';
import { BACKEND_MODE, isNetworkEnabled } from './runtime.js';
import * as local from './providers/local.js';
import * as supabase from './providers/supabase.js';

const provider = BACKEND_MODE === 'local' ? local : supabase;

export { BACKEND_MODE, MultiplayerError, isNetworkEnabled };

export function isMultiplayerConfigured() {
  return provider.isMultiplayerConfigured();
}

export function loadAuthSession() {
  return provider.loadAuthSession();
}

export function clearAuthSession() {
  return provider.clearAuthSession();
}

export function ensureAuthSession() {
  return provider.ensureAuthSession();
}

export function createRemoteProfile(payload) {
  return provider.createRemoteProfile(payload);
}

export function updateRemoteProfile(payload) {
  return provider.updateRemoteProfile(payload);
}

export function fetchLeaderboard() {
  return provider.fetchLeaderboard();
}

export function startRemoteAttempt(payload) {
  return provider.startRemoteAttempt(payload);
}

export function recordRemoteHint(payload) {
  return provider.recordRemoteHint(payload);
}

export function recordRemoteValidation(payload) {
  return provider.recordRemoteValidation(payload);
}

export function submitRemoteSolution(payload) {
  return provider.submitRemoteSolution(payload);
}

export function confirmNormalizaQuest(payload) {
  return provider.confirmNormalizaQuest(payload);
}

export function syncRemoteProfile(player) {
  return provider.syncRemoteProfile(player);
}
