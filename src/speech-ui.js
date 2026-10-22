import {T} from './content.js';
export const VOICE_UI={
 voice:T('Громкость речи','Сөйлеу дыбысы','Speech volume'),
 narration:T('Озвучивать реплики','Репликаларды дыбыстау','Spoken dialogue'),
 replay:T('Повторить реплику','Репликаны қайталау','Replay line'),
 toggle:T('Включить или выключить озвучку','Дыбыстауды қосу не өшіру','Toggle spoken dialogue'),
};
export function replayButton(app,id){return `<button type="button" id="${id}" class="voice-replay" data-voice-replay aria-label="${app.l(VOICE_UI.replay)}">↻ ${app.l(VOICE_UI.replay)}</button>`;}
