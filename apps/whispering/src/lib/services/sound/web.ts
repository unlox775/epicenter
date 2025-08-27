import { Ok } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { audioBuffers, audioContext } from './assets';

export function createPlaySoundServiceWeb(): PlaySoundService {
        return {
                async playSound(soundName) {
                        if (!document.hidden) {
                                if (audioContext.state === 'suspended') {
                                        await audioContext.resume();
                                }
                                const buffer = await audioBuffers[soundName];
                                const source = audioContext.createBufferSource();
                                source.buffer = buffer;
                                source.connect(audioContext.destination);
                                source.start();
                        }
                        return Ok(undefined);
                },
        };
}
