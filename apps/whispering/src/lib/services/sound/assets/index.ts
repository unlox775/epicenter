import type { WhisperingSoundNames } from '$lib/constants/sounds';
import {
	default as captureVadSoundSrc,
	default as stopManualSoundSrc,
} from './sound_ex_machina_Button_Blip.mp3';
import startManualSoundSrc from './manual_start_quiet.mp3';
import manualStopSoundSrc from './manual_stop_quiet.mp3';
import stopVadSoundSrc from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import startVadSoundSrc from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import cancelSoundSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import completionChimeSrc from './completion_chime_quiet.mp3';

export const audioElements = {
	'manual-start': new Audio(startManualSoundSrc),
	'manual-cancel': new Audio(cancelSoundSrc),
	'manual-stop': new Audio(manualStopSoundSrc),
	'vad-start': new Audio(startVadSoundSrc),
	'vad-capture': new Audio(captureVadSoundSrc),
	'vad-stop': new Audio(stopVadSoundSrc),
	transcriptionComplete: new Audio(completionChimeSrc),
	transformationComplete: new Audio(completionChimeSrc),
} satisfies Record<WhisperingSoundNames, HTMLAudioElement>;
