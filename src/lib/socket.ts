import { io } from 'socket.io-client';
import { BACKEND_BASE } from './api';
export const socket = io(BACKEND_BASE, { withCredentials: true });
