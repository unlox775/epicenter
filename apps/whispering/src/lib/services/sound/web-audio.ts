import { tryAsync } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { PlaySoundServiceErr } from './types';
import { audioElements } from './assets'; // Reuses existing sound paths
import { invoke } from '@tauri-apps/api/core';

const soundSources = {
	'manual-start': audioElements['manual-start'].src,
	'manual-cancel': audioElements['manual-cancel'].src,
	'manual-stop': audioElements['manual-stop'].src,
	'vad-start': audioElements['vad-start'].src,
	'vad-capture': audioElements['vad-capture'].src,
	'vad-stop': audioElements['vad-stop'].src,
	transcriptionComplete: audioElements.transcriptionComplete.src,
	transformationComplete: audioElements.transformationComplete.src,
} as const;

let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();

// System event monitoring
let systemEventListenersInitialized = false;

// Initialize system event monitoring
function initializeSystemEventMonitoring(): void {
	if (systemEventListenersInitialized) return;
	
	logWebAudio('[SystemEvents] Initializing system event monitoring...');
	
	// Page visibility changes (app focus/blur, screen on/off)
	document.addEventListener('visibilitychange', () => {
		logWebAudio(`[SystemEvents] Page visibility changed: ${document.visibilityState}`);
	});
	
	// Window focus/blur events
	window.addEventListener('focus', () => {
		logWebAudio('[SystemEvents] Window gained focus');
	});
	
	window.addEventListener('blur', () => {
		logWebAudio('[SystemEvents] Window lost focus');
	});
	
	// Page show/hide events (back/forward cache)
	window.addEventListener('pageshow', (event) => {
		logWebAudio(`[SystemEvents] Page shown (persisted: ${event.persisted})`);
	});
	
	window.addEventListener('pagehide', (event) => {
		logWebAudio(`[SystemEvents] Page hidden (persisted: ${event.persisted})`);
	});
	
	// Audio device changes
	if (navigator.mediaDevices) {
		navigator.mediaDevices.addEventListener('devicechange', async () => {
			logWebAudio('[SystemEvents] Audio device change detected');
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
				logWebAudio(`[SystemEvents] Audio output devices: ${audioOutputs.length} found`);
			} catch (error) {
				logWebAudio(`[SystemEvents] Failed to enumerate audio devices: ${error}`);
			}
		});
	}
	
	// Online/offline status
	window.addEventListener('online', () => {
		logWebAudio('[SystemEvents] Network: Online');
	});
	
	window.addEventListener('offline', () => {
		logWebAudio('[SystemEvents] Network: Offline');
	});
	
	// Battery status (if available)
	if ('getBattery' in navigator) {
		(navigator as any).getBattery().then((battery: any) => {
			battery.addEventListener('chargingchange', () => {
				logWebAudio(`[SystemEvents] Battery charging: ${battery.charging}`);
			});
			
			battery.addEventListener('levelchange', () => {
				logWebAudio(`[SystemEvents] Battery level: ${Math.round(battery.level * 100)}%`);
			});
		}).catch((error: any) => {
			logWebAudio(`[SystemEvents] Battery API not available: ${error}`);
		});
	}
	
	systemEventListenersInitialized = true;
	logWebAudio('[SystemEvents] System event monitoring initialized');
}

// Dual logging function - logs to both console and Tauri
async function logWebAudio(message: string): Promise<void> {
	// Always log to console (for dev tools)
	console.log(message);
	
	// Also log to Tauri (for production debugging)
	try {
		await invoke('log_web_audio', { message });
	} catch (error) {
		// Silently fail if Tauri logging isn't available
		// This ensures the function works in both dev and production
	}
}

function getAudioContext(): AudioContext {
	if (!audioContext || audioContext.state === 'closed') {
		logWebAudio('[WebAudio] Creating new AudioContext');
		audioContext = new AudioContext();
		
		// Initialize system event monitoring on first AudioContext creation
		initializeSystemEventMonitoring();
		
		// Enhanced state change monitoring
		audioContext.addEventListener('statechange', () => {
			logWebAudio(`[WebAudio] AudioContext state changed to: ${audioContext?.state}`);
			// Note: 'interrupted' state is not in TypeScript types but may exist in runtime
			if (audioContext?.state === 'interrupted' as any) {
				logWebAudio('[WebAudio] CRITICAL: AudioContext interrupted - audio output may be broken');
			}
		});
		
		// Monitor audio device changes (if supported)
		if ('sinkchange' in audioContext) {
			audioContext.addEventListener('sinkchange', () => {
				logWebAudio(`[WebAudio] Audio output device changed`);
			});
		}
	}
	return audioContext!; // We know it's not null here since we just created it
}

async function ensureAudioContextReady(): Promise<AudioContext> {
	const context = getAudioContext();
	
	// Log detailed context state
	logWebAudio(`[WebAudio] AudioContext state: ${context.state}`);
	logWebAudio(`[WebAudio] AudioContext sampleRate: ${context.sampleRate}`);
	logWebAudio(`[WebAudio] AudioContext currentTime: ${context.currentTime}`);
	
	if (context.state === 'suspended') {
		logWebAudio('[WebAudio] AudioContext suspended, attempting to resume...');
		try {
			await context.resume();
			logWebAudio('[WebAudio] AudioContext resumed successfully');
		} catch (error) {
			logWebAudio(`[WebAudio] Failed to resume AudioContext: ${error}`);
			audioContext = new AudioContext(); // Create new if resume fails
			logWebAudio('[WebAudio] Created new AudioContext after resume failure');
		}
	}
	return audioContext!; // Return the (possibly new/resumed) context
}

// Deep AudioContext node analysis (debugging tool)
async function analyzeAudioContextNodes(): Promise<void> {
	try {
		const context = getAudioContext();
		logWebAudio('[WebAudio] === Starting deep AudioContext node analysis ===');
		
		// Analyze destination node properties
		const destination = context.destination;
		logWebAudio(`[WebAudio] Destination node type: ${destination.constructor.name}`);
		logWebAudio(`[WebAudio] Destination numberOfInputs: ${destination.numberOfInputs}`);
		logWebAudio(`[WebAudio] Destination numberOfOutputs: ${destination.numberOfOutputs}`);
		logWebAudio(`[WebAudio] Destination channelCount: ${destination.channelCount}`);
		logWebAudio(`[WebAudio] Destination channelCountMode: ${destination.channelCountMode}`);
		logWebAudio(`[WebAudio] Destination channelInterpretation: ${destination.channelInterpretation}`);
		
		// Test actual audio output with a very short, quiet sound
		const oscillator = context.createOscillator();
		const gainNode = context.createGain();
		const analyser = context.createAnalyser();
		
		// Set up a very quiet test (not silent, but barely audible)
		gainNode.gain.value = 0.001; // Very quiet but not silent
		oscillator.frequency.value = 440; // A4 note
		oscillator.type = 'sine';
		
		// Connect: oscillator -> gain -> analyser -> destination
		oscillator.connect(gainNode);
		gainNode.connect(analyser);
		analyser.connect(destination);
		
		// Analyze the audio signal
		analyser.fftSize = 256;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		
		// Start the test
		oscillator.start();
		
		// Wait a bit for the signal to stabilize
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// Check if we're getting audio data
		analyser.getByteFrequencyData(dataArray);
		const maxAmplitude = Math.max(...dataArray);
		logWebAudio(`[WebAudio] Audio signal amplitude: ${maxAmplitude} (0-255 scale)`);
		
		// Stop the test
		oscillator.stop();
		
		// Analyze the results
		if (maxAmplitude > 0) {
			logWebAudio('[WebAudio] Audio signal detected - audio pipeline appears functional');
		} else {
			logWebAudio('[WebAudio] WARNING: No audio signal detected - audio pipeline may be broken');
		}
		
		logWebAudio('[WebAudio] === Deep AudioContext node analysis completed ===');
		
	} catch (error) {
		logWebAudio(`[WebAudio] Deep node analysis FAILED: ${error}`);
		logWebAudio('[WebAudio] === Deep AudioContext node analysis completed ===');
	}
}

async function loadAudioBuffer(audioSrc: string): Promise<AudioBuffer> {
	if (audioBufferCache.has(audioSrc)) {
		logWebAudio(`[WebAudio] Using cached audio buffer for: ${audioSrc}`);
		return audioBufferCache.get(audioSrc)!;
	}

	logWebAudio(`[WebAudio] Loading audio buffer for: ${audioSrc}`);
	const response = await fetch(audioSrc);
	const arrayBuffer = await response.arrayBuffer();
	const audioBuffer = await decodeAudioData(arrayBuffer);
	audioBufferCache.set(audioSrc, audioBuffer);
	logWebAudio(`[WebAudio] Audio buffer loaded and cached, duration: ${audioBuffer.duration}`);
	return audioBuffer;
}

async function decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
	const context = getAudioContext();
	if (!context) {
		throw new Error('Failed to get AudioContext');
	}
	return new Promise((resolve, reject) => {
		context.decodeAudioData(
			arrayBuffer,
			(audioBuffer) => {
				logWebAudio(`[WebAudio] Audio data decoded successfully, duration: ${audioBuffer.duration}`);
				resolve(audioBuffer);
			},
			(error) => {
				logWebAudio(`[WebAudio] Failed to decode audio data: ${error}`);
				reject(error);
			}
		);
	});
}

async function playSoundWithWebAudio(audioSrc: string, soundName?: string): Promise<void> {
	try {
		const context = await ensureAudioContextReady();
		const audioBuffer = await loadAudioBuffer(audioSrc);
		
		// Log before creating source
		logWebAudio(`[WebAudio] Creating AudioBufferSourceNode, buffer duration: ${audioBuffer.duration}`);
		logWebAudio(`[WebAudio] Context state before play: ${context.state}`);
		logWebAudio(`[WebAudio] Context currentTime before play: ${context.currentTime}`);
		
		const source = context.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(context.destination);
		
		// Track start time for duration calculation
		const startTime = context.currentTime;
		
		// Comprehensive lifecycle tracking
		source.onended = () => { 
			const actualDuration = context.currentTime - startTime;
			logWebAudio('[WebAudio] Sound playback completed successfully');
			logWebAudio(`[WebAudio] Expected duration: ${audioBuffer.duration}`);
			logWebAudio(`[WebAudio] Actual duration played: ${actualDuration}`);
			logWebAudio(`[WebAudio] Context state after playback: ${context.state}`);
			
			// Run deep AudioContext node analysis after transcription complete sound
			if (soundName === 'transcriptionComplete') {
				logWebAudio('[WebAudio] Transcription complete sound finished - scheduling deep node analysis');
				setTimeout(async () => {
					await analyzeAudioContextNodes();
				}, 500); // Half second delay as requested
			}
		};
		
		// Log before starting
		logWebAudio('[WebAudio] Starting audio playback...');
		source.start();
		logWebAudio(`[WebAudio] Audio playback started at context time: ${startTime}`);
		
		// Check if we can detect media session state
		if ('mediaSession' in navigator) {
			logWebAudio(`[WebAudio] Media session state: ${navigator.mediaSession.playbackState}`);
		}
		
	} catch (error) {
		logWebAudio(`[WebAudio] Failed to play sound: ${error}`);
		throw error;
	}
}

export function createPlaySoundServiceWebAudio(): PlaySoundService {
	return {
		playSound: async (soundName) => tryAsync({
			try: async () => {
				logWebAudio(`[WebAudio] === Starting playSound for: ${soundName} ===`);
				const audioSrc = soundSources[soundName];
				if (!audioSrc) {
					throw new Error(`Unknown sound name: ${soundName}`);
				}
				
				logWebAudio(`[WebAudio] Sound source: ${audioSrc}`);
				await playSoundWithWebAudio(audioSrc, soundName);
				logWebAudio(`[WebAudio] === Completed playSound for: ${soundName} ===`);
			},
			mapErr: (error) => {
				logWebAudio(`[WebAudio] PlaySound service error: ${error}`);
				return PlaySoundServiceErr({
					message: 'Failed to play sound with Web Audio API',
					context: { soundName },
					cause: error,
				});
			},
		}),
	};
}
