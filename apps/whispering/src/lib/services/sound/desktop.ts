import { tryAsync } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { audioBuffers, audioContext } from './assets';
import { PlaySoundServiceErr } from './types';

export function createPlaySoundServiceDesktop(): PlaySoundService {
        return {
                playSound(soundName) {
                        return tryAsync({
                                try: async () => {
                                        if (audioContext.state === 'suspended') {
                                                await audioContext.resume();
                                        }
                                        const buffer = await audioBuffers[soundName];
                                        const source = audioContext.createBufferSource();
                                        source.buffer = buffer;
                                        source.connect(audioContext.destination);
                                        source.start();
                                },
                                mapErr: (error) =>
                                        PlaySoundServiceErr({
                                                message: 'Failed to play sound',
                                                context: { soundName },
                                                cause: error,
                                        }),
                        });
                },
        };
}
