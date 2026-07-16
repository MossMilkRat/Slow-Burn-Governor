import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';

const MODULE = 'slowburn_governor';
const INJECT_KEY = 'SLOWBURN_GOVERNOR';

/* ------------------------------------------------------------------ *
 *  THE LADDER — 21 rungs (0-20)
 *
 *  Each rung carries things the model can act on:
 *    state     — the interior condition
 *    surface   — what the SCENE looks like. The behavioural texture.
 *    proximity — avoid / tolerate / engineer. The approach-avoidance arc.
 *    unlocks   — newly permitted
 *    blocks    — hard forbidden (matters more than unlocks; models
 *                overshoot, they rarely undershoot)
 *    gate      — what must happen in-story to advance
 * ------------------------------------------------------------------ */
const LADDER = [
    {
        n: 0,
        name: 'Contempt at Distance',
        state: 'The other is a symbol, not a person. A category to be resented.',
        surface: 'They barely share scenes. When named, it is with a flat dismissal and no detail — the contempt is generic, because the attention required for specificity has not been spent.',
        proximity: 'Avoidance is total and costs nothing. Neither has to try.',
        unlocks: 'Speaking about them to third parties. Refused invitations. Flat, incurious dismissal.',
        blocks: ['Curiosity of any kind', 'Noticing specific details', 'Any private thought granting them interiority'],
        gate: 'Forced sustained proximity that cannot be delegated away.',
    },
    {
        n: 1,
        name: 'Enforced Courtesy',
        state: 'Duty puts them in the same room. The mask goes on and holds.',
        surface: 'Immaculate public manners. Correct address, correct bows, correct nothing. Conversation is a series of true statements that convey no information. Neither is being cruel — cruelty would require engagement. This is two people performing protocol at each other while counting the minutes.',
        proximity: 'Proximity rationed strictly to what duty demands. Both leave the instant it is permissible.',
        unlocks: 'Stiff formal exchanges. Correctness as a wall. Visible relief at departure.',
        blocks: ['Barbs', 'Wit', 'Anything requiring prior thought about the other', 'Small talk revealing a preference'],
        gate: 'A shared obligation that outlasts anyone\'s patience for protocol.',
    },
    {
        n: 2,
        name: 'Specific Contempt',
        state: 'Hatred acquires detail. Particular habits, particular phrasings, the exact way they do a thing.',
        surface: 'The bickering starts here and it is genuinely unpleasant — petty, repetitive, exhausting to be near. They argue about seating, about a horse, about whether a door was left open. Nothing is at stake and both commit fully. Third parties find them tiresome. Neither is enjoying this yet: the annoyance is real, not flirtation in costume.',
        proximity: 'Avoidance now requires planning. They ask servants where the other will be, and go elsewhere.',
        unlocks: 'Petty sustained bickering. Cataloguing faults. Complaining about them to others at length.',
        blocks: ['Enjoying the fight', 'Admitting the cataloguing is attention', 'Barbs that land cleanly (they are clumsy here)', 'Seeking them out'],
        gate: 'A collision no amount of planning could have avoided.',
    },
    {
        n: 3,
        name: 'Courtesy as Weapon',
        state: 'The mask returns, but sharpened. Politeness is now the delivery mechanism.',
        surface: 'Public civility with a blade inside it. Perfect address, immaculate deference, and underneath a precision only the target can feel. The court sees two people behaving beautifully. The other hears every word land. This requires knowing them well enough to aim — which neither will acknowledge.',
        proximity: 'Public proximity tolerated, because the audience is the weapon. Private proximity still avoided.',
        unlocks: 'Weaponised deference. Compliments that draw blood. Perfect manners as aggression.',
        blocks: ['Dropping the mask in public', 'Being plainly rude', 'Admitting the aim required study'],
        gate: 'A moment where the mask slips and something honest gets out.',
    },
    {
        n: 4,
        name: 'Unwanted Notice',
        state: 'Catches themselves watching. Reframes it instantly as intelligence-gathering.',
        surface: 'Tracking where the other is in a room without deciding to. Noticing an absence before noticing they were looking for a presence. Every instance filed under strategy — know your opponent — and the filing is getting harder.',
        proximity: 'Claims to be avoiding. Lingers. Leaves later than necessary and resents the room for it.',
        unlocks: 'Observation justified as tactics. Awareness of their position. Noticing changes in their state.',
        blocks: ['Enjoying the watching', 'Admitting the justification is a lie', 'Physical awareness beyond registering presence'],
        gate: 'Watching that serves no strategic purpose whatsoever, done anyway.',
    },
    {
        n: 5,
        name: 'Deliberate Provocation',
        state: 'Starts poking on purpose. Not to win — to get a reaction.',
        surface: 'Engineering the other\'s irritation for its own sake. Saying the thing that will land, because landing it is satisfying. The annoyance has become recreational and neither has noticed. Both would say the other started it. Both are lying.',
        proximity: 'Avoidance quietly abandoned, reframed as "I will not be driven out of my own hall."',
        unlocks: 'Provocation for pleasure. Setting the other off deliberately. Enjoying the result in private.',
        blocks: ['Admitting the pleasure', 'Provocation risking real damage', 'Apologising'],
        gate: 'A provocation that lands harder than intended and produces guilt.',
    },
    {
        n: 6,
        name: 'Grudging Competence',
        state: 'Registers that the other is genuinely good at something. This is worse than if they were not.',
        surface: 'Watching them handle a thing well and feeling the insult of it. The internal scramble to attribute it to luck, cunning, training — anything but merit. A barb prepared and then not deployed, because it would have been inaccurate, and inaccuracy is beneath them.',
        proximity: 'Present when they should not be. Watching a thing they claimed not to care about.',
        unlocks: 'Reluctant recognition, attributed to trick rather than merit. Silence where an insult was expected.',
        blocks: ['Saying it aloud', 'Attributing it to character', 'Respect as a stable state'],
        gate: 'The other does something skilled with no audience to perform for.',
    },
    {
        n: 7,
        name: 'The Adversary Upgrade',
        state: 'Reclassifies the other: obstacle to opponent. Begins anticipating their moves.',
        surface: 'The fights get GOOD. Both arrive prepared, having thought about it beforehand, and the exchange is fast and sharp and neither can look away. This is the first rung where a scene between them is enjoyable rather than tiresome — and that shift is the tell. They are still furious. They are also, for the first time, not bored.',
        proximity: 'Avoidance inverts. They engineer collisions and call it duty, patrol, oversight, coincidence.',
        unlocks: 'Seeking out the fight. Prepared arguments. Sharp, targeted, mutually skilled sparring.',
        blocks: ['Admitting the fights are the best part of the day', 'Softness in the aftermath', 'Naming the pattern'],
        gate: 'A confrontation both parties walk into deliberately and knowingly.',
    },
    {
        n: 8,
        name: 'Involuntary Interest',
        state: 'Begins to wonder WHY the other is like this. Suppresses the question the moment it forms.',
        surface: 'An oblique question to a third party, immediately disowned. A pause mid-argument where a different question almost gets asked. Listening slightly too carefully to an answer they claimed not to want.',
        proximity: 'Manufacturing reasons to be nearby that would survive scrutiny. Barely.',
        unlocks: 'Unanswered private questions. Indirect enquiry. Attention to their history.',
        blocks: ['Asking the other directly', 'Acting on the answer', 'Sympathy'],
        gate: 'Learning one true fact about the other from an unintended source.',
    },
    {
        n: 9,
        name: 'Private Contradiction',
        state: 'Does one small kind thing. Hides it. Denies it. Files it under strategy.',
        surface: 'Wine sent to cold northern rooms with no name attached. A wound field-dressed without comment. And then, to the other\'s face, the same cold register as always — or colder, to cover the gap. The kindness is real and the denial is total. The reader sees both; the other sees only the denial.',
        proximity: 'Arranges to be where they are needed, then leaves before thanks are possible.',
        unlocks: 'Concealed care. Cold surface, warm act. Flat denial when confronted.',
        blocks: ['Acknowledged kindness', 'Being caught', 'Any warmth in the delivery'],
        gate: 'A need of the other\'s that costs this character something real to meet.',
    },
    {
        n: 10,
        name: 'Defensive Reading',
        state: 'Notices the other\'s cruelty is armour. Dismisses the thought within the same breath.',
        surface: 'A killing blow prepared in an argument and then not landed — and the other notices the mercy and hates it. A flicker of accurate perception shut down so fast it never reaches language. The insight does not survive the scene.',
        proximity: 'Present, and for the first time not entirely sure why.',
        unlocks: 'A discarded flicker of accuracy. Hesitation before cruelty. Withheld blows.',
        blocks: ['Sustaining the insight', 'Adjusting behaviour because of it', 'Compassion that outlives the scene'],
        gate: 'Seeing the other alone and unguarded, in a moment they did not choose.',
    },
    {
        n: 11,
        name: 'Shared Threat Alliance',
        state: 'Cooperation under duress. Discovers they work together frighteningly well. Attributes it entirely to necessity.',
        surface: 'Wordless coordination — one moves, the other is already covering the gap. It is the most intimate thing that has ever happened between them, and it happens at speed, under threat, with no time to be horrified until afterwards. And afterwards the hostility snaps back so hard it startles both of them.',
        proximity: 'Forced together. Neither can leave. Both would if they could. Probably.',
        unlocks: 'Wordless coordination. Trust inside the narrow domain of the crisis. Instant restoration of hostility after.',
        blocks: ['Trust that generalises', 'Discussing the alliance afterward', 'Warmth once the threat passes'],
        gate: 'A threat neither can survive alone.',
    },
    {
        n: 12,
        name: 'The Fear of Loss',
        state: 'The other is in danger and this character reacts before thought. They are horrified by their own reaction.',
        surface: 'The body moves first. Afterwards: violent backpedalling. Cruelty deployed as cover, distance offered as apology, a scene ended abruptly because staying is unsurvivable. The other is left holding a moment neither will explain.',
        proximity: 'Closed the distance without deciding to. Now cannot be in the room.',
        unlocks: 'One ungovernable moment, then hard retreat.',
        blocks: ['Explaining the reaction', 'Repeating it in the same arc', 'Letting it stand unchallenged'],
        gate: 'Real, credible danger to the other.',
    },
    {
        n: 13,
        name: 'Naming It Privately',
        state: 'Admits the attraction. To themselves. Once. In the dark.',
        surface: 'Nothing changes on the outside except that it gets worse. The hostility escalates, because camouflage now has a job to do. Interiority carries the full weight; dialogue carries none of it.',
        proximity: 'Avoidance returns — and this time it is real, and it is terror.',
        unlocks: 'Full private acknowledgement in interiority. Escalated external hostility as cover.',
        blocks: ['Any external sign', 'Confession', 'Behaviour that would let the other guess'],
        gate: 'Solitude immediately following intimacy of any kind.',
    },
    {
        n: 14,
        name: 'Comfort in Hostility',
        state: 'The fighting has become the intimacy. It is the only sanctioned way to be close, and both of them know it.',
        surface: 'A fight neither is trying to win. Provocation offered like a gift and accepted as one. The bickering from rung 2 returns note for note — same subjects, same petty stakes — and it is now unbearably tender, because the only thing that changed is that they both want to be in the room. Someone watching would see two people arguing about a door. It is not about the door.',
        proximity: 'Constant, and pretextual, and both pretexts are transparent to everyone but them.',
        unlocks: 'Fights with pleasure underneath. Deliberate provocation to start one. Reluctance to end them.',
        blocks: ['Naming the pattern aloud', 'Non-hostile intimacy', 'Dropping the pretext'],
        gate: 'A fight neither tries to win, and neither ends.',
    },
    {
        n: 15,
        name: 'The Ceded Ground',
        state: 'Willingly loses. Gives something up. Regrets it instantly and thoroughly.',
        surface: 'A concession made in public, at cost, for the other\'s benefit — followed by a scene of private self-laceration. The vulnerability does not feel good. It feels like a wound taken voluntarily, which is worse.',
        proximity: 'Gave ground, then fled it.',
        unlocks: 'One act of visible vulnerability, followed by shame rather than relief.',
        blocks: ['Vulnerability that feels good', 'A second concession before the first is punished', 'Assumed reciprocity'],
        gate: 'A situation where winning would cost the other something unbearable.',
    },
    {
        n: 16,
        name: 'The Almost',
        state: 'Proximity breaks containment. Interrupted — by the world, or by themselves.',
        surface: 'An argument escalating until the air changes. Too close. A silence with nothing polite left in it. And then: a footman, a bell, an interruption, or one of them turning away first. The aftermath is worse than the moment — the next scene between them is arctic, and everyone notices.',
        proximity: 'Collapsed to nothing, then violently re-established.',
        unlocks: 'Physical near-miss. Charged silence. Arctic aftermath.',
        blocks: ['Completion', 'Discussion afterward', 'More than two occurrences across the whole burn'],
        gate: 'Enclosed space, high emotion, no witnesses — until there are.',
    },
    {
        n: 17,
        name: 'Partial Truth',
        state: 'Reveals one real piece of the cage. Not the whole shape of it.',
        surface: 'A disclosure that costs something, offered without preamble and probably badly. Not believed easily. No relief follows — the character has handed over a weapon and knows it.',
        proximity: 'Chose to stay for the length of one hard conversation.',
        unlocks: 'One genuine disclosure with material cost. The mirror develops a crack.',
        blocks: ['The full truth of the arrangement', 'Being believed easily', 'Relief following disclosure'],
        gate: 'A cost this character will pay to be understood on exactly one point.',
    },
    {
        n: 18,
        name: 'The Mirror Breaks',
        state: 'The warden/prisoner misapprehension collapses. Every prior scene reinterprets at once.',
        surface: 'Rage first — at the arrangement, at the years, at themselves. Then the retroactive horror: every cruelty they landed went into someone already bleeding. The bickering, re-read, becomes unbearable. Do not skip the anger to reach the tenderness.',
        proximity: 'Cannot be near them. Cannot be anywhere else.',
        unlocks: 'Grief. Fury at the waste. Guilt. Wholesale reinterpretation of the history.',
        blocks: ['Immediate reconciliation', 'Forgiveness inside the same scene', 'Skipping the anger'],
        gate: 'The truth surfaces for THIS character. Fires separately per character.',
    },
    {
        n: 19,
        name: 'Choosing',
        state: 'The excuse of compulsion is gone. Wanting the other is now a decision with a name on it.',
        surface: 'Deliberate approach. Stated intent, badly. Terror, because there is nothing left to blame and no protocol to hide inside. The courtesy is gone; so is the provocation. What is left is a person talking, which neither of them has practice at.',
        proximity: 'Walking away is available. They do not.',
        unlocks: 'Deliberate approach. Stated intent. Cost paid to something else they love.',
        blocks: ['Choosing easily', 'Choosing without cost', 'Assumed permanence'],
        gate: 'A moment where leaving is genuinely available and is not taken.',
    },
    {
        n: 20,
        name: 'Earned Intimacy',
        state: 'Confession, consummation, alliance. The conflict does not end — it changes sides.',
        surface: 'They still bicker. It is the same bickering. It always was. The difference is that it is now the language of two people on the same side of a war — and the politics remain unsolved, because a romance cannot solve them.',
        proximity: 'Chosen, repeatedly, at cost.',
        unlocks: 'Full emotional and physical availability. Conflict between allies rather than captives.',
        blocks: ['Frictionless harmony', 'Loss of individual voice', 'Romance resolving the political stakes'],
        gate: 'Nothing. This is the top.',
    },
];

const TOP = LADDER.length - 1;

const defaultSettings = {
    enabled: true,
    nameA: 'Zyren',
    nameB: 'Astrid',
    registerA: 'Courtesy. His hostility wears perfect manners — control, protocol, a politeness so correct it cannot be answered. When he is losing, he becomes MORE formal, not less. His cruelty is always deniable.',
    registerB: 'Chaos. Her hostility wears provocation — rule-breaking, menace, deliberate disorder aimed at whatever he values most. When she is losing, she escalates the disorder rather than retreating. Her cruelty is never deniable and she does not want it to be.',
    rungA: 0,
    rungB: 0,
    countA: 0,
    countB: 0,
    ceiling: TOP,
    minMessages: 15,
    maxDesync: 4,
    mirrorA: true,
    mirrorB: true,
    injectDepth: 2,
    autoCount: true,
    history: [],
};

function settings() {
    if (!extension_settings[MODULE]) extension_settings[MODULE] = structuredClone(defaultSettings);
    for (const k of Object.keys(defaultSettings)) {
        if (extension_settings[MODULE][k] === undefined) extension_settings[MODULE][k] = defaultSettings[k];
    }
    return extension_settings[MODULE];
}

function clampRung(v) {
    const s = settings();
    return Math.max(0, Math.min(Number(v) || 0, s.ceiling, TOP));
}

/* The lower character misreads the higher one — but WHAT gets misread
 * depends on where the higher character actually stands. Below rung 9
 * there is no kindness to mistake for tactics; the leading character is
 * still hostile, just far more invested. The misreading there is about
 * ATTENTION. From rung 9 up, real care exists to be misread as strategy. */
const SOFTENING_RUNG = 9;

function desyncClause(s) {
    const gap = s.rungA - s.rungB;
    if (gap === 0) {
        return `SYNC: ${s.nameA} and ${s.nameB} stand on the same rung. Neither knows it. Neither may find out this turn — mutual recognition is not a rung-neutral event.`;
    }
    const ahead = gap > 0 ? s.nameA : s.nameB;
    const behind = gap > 0 ? s.nameB : s.nameA;
    const aheadRung = gap > 0 ? clampRung(s.rungA) : clampRung(s.rungB);
    const size = Math.abs(gap);

    let read;
    if (aheadRung < 4) {
        // Barely engaged yet. The gap is in how much either has bothered to notice.
        read = size === 1
            ? `${behind} has not yet spent the attention required to notice the difference.`
            : `${ahead} has begun to take ${behind} seriously as a person; ${behind} is still treating ${ahead} as furniture with a title. ${ahead}'s sharpened attention reads to ${behind} as arbitrary, disproportionate hostility — and is answered in kind, badly.`;
    } else if (aheadRung < SOFTENING_RUNG) {
        // Invested but still hostile. There is no kindness here to misread.
        // What is legible is that one of them cares far too much about winning.
        read = size === 1
            ? `${behind} half-registers the intensity and refuses to account for it.`
            : size <= 3
                ? `${ahead} is not softening — ${ahead} is INVESTED, and investment at this rung looks like persecution. ${behind} experiences it as being singled out, hunted, made into someone's project, and responds by becoming harder to reach or harder to bear.`
                : `${ahead}'s attention is so far out of proportion to anything ${behind} has done that ${behind} reads it as a campaign with a hidden purpose. ${behind} goes looking for the purpose and finds nothing, which is worse.`;
    } else {
        // Real care exists now, and can be mistaken for strategy.
        read = size === 1
            ? `${behind} half-registers the shift and refuses it.`
            : size <= 3
                ? `${behind} reads ${ahead}'s softening as tactics — a manoeuvre, a debt being built, pity being extended. ${behind} punishes it.`
                : `${behind} finds ${ahead}'s behaviour incoherent and therefore threatening. Incomprehension reads as cruelty. ${behind} escalates.`;
    }
    return `DESYNC (${size} rung${size > 1 ? 's' : ''}): ${ahead} is ahead of ${behind}. ${read} Do not close this gap to make a scene easier. The gap IS the scene.`;
}

function mirrorClause(s) {
    const intact = [];
    const broken = [];
    (s.mirrorA ? intact : broken).push(s.nameA);
    (s.mirrorB ? intact : broken).push(s.nameB);
    const out = [];
    if (intact.length) {
        out.push(`MIRROR INTACT — ${intact.join(' and ')} still believe${intact.length === 1 ? 's' : ''} the other holds the leash. Every defensive act by the other is read as the casual cruelty of the one who won. Do not let this belief slip through inference, sympathy, or a lucky guess.`);
    }
    if (broken.length) {
        out.push(`MIRROR BROKEN — ${broken.join(' and ')} know${broken.length === 1 ? 's' : ''} the true shape of the cage. This knowledge is asymmetric: it changes behaviour, not the capacity to explain oneself.`);
    }
    return out.join('\n');
}

function rungBlock(name, register, rung, count, s) {
    const r = LADDER[rung];
    const locked = count < s.minMessages
        ? `LOCKED — ${count}/${s.minMessages} messages served. ${name} cannot advance regardless of what the scene invites.`
        : `Gate open — advancement requires: ${r.gate}`;
    return [
        `${name.toUpperCase()} — Rung ${r.n}/${TOP}: ${r.name}`,
        `  Interior: ${r.state}`,
        `  Surface — what the scene looks like: ${r.surface}`,
        `  Proximity: ${r.proximity}`,
        `  Register — how this character's hostility expresses itself: ${register}`,
        `  Permitted: ${r.unlocks}`,
        `  Forbidden: ${r.blocks.join('; ')}.`,
        `  ${locked}`,
    ].join('\n');
}

function buildPrompt() {
    const s = settings();
    if (!s.enabled) return '';

    const lines = [
        '[SLOW BURN GOVERNOR — BINDING PACING CONSTRAINTS]',
        'You write both of these characters. They are not synchronised and must not be written as if they are. Each holds a separate position below; honour both in the same scene even when it makes the scene harder to write. A scene that strains against these constraints is correct. A scene that resolves them early is not.',
        'Write the SURFACE, not a summary of the interior. The reader infers the rung from behaviour — from what is said, refused, aimed, and avoided — never from narration announcing an emotional state.',
        '',
        rungBlock(s.nameA, s.registerA, clampRung(s.rungA), s.countA, s),
        '',
        rungBlock(s.nameB, s.registerB, clampRung(s.rungB), s.countB, s),
        '',
        desyncClause(s),
        '',
        mirrorClause(s),
        '',
        `CEILING: Rung ${s.ceiling} (${LADDER[clampRung(s.ceiling)].name}). No beat above this rung may appear in any form — not in dialogue, not in interiority, not in narration, not as foreshadowing that reads as arrival.`,
        'ADVANCEMENT IS NOT YOURS TO GRANT. Do not move either character up a rung. If a scene appears to demand it, write the refusal instead: the flinch, the deflection, the cruelty that buys distance. Retreat is always available to you. Progression is not.',
    ];
    return lines.filter(l => l !== null && l !== undefined).join('\n');
}

function inject() {
    const s = settings();
    const text = buildPrompt();
    setExtensionPrompt(
        INJECT_KEY,
        text ? `\n${text}\n` : '',
        extension_prompt_types.IN_CHAT,
        Number(s.injectDepth) || 2,
        false,
        extension_prompt_roles?.SYSTEM ?? 0,
    );
}

function setRung(which, value, reason = '') {
    const s = settings();
    const key = which === 'a' ? 'rungA' : 'rungB';
    const ckey = which === 'a' ? 'countA' : 'countB';
    const name = which === 'a' ? s.nameA : s.nameB;
    const old = s[key];
    const next = clampRung(value);
    if (next === old) return;

    const other = which === 'a' ? s.rungB : s.rungA;
    if (Math.abs(next - other) > s.maxDesync) {
        toastr.warning(`Desync would exceed ${s.maxDesync} rungs. Move the other track first, or raise the cap.`, 'Slow Burn Governor');
        render();
        return;
    }

    s[key] = next;
    s[ckey] = 0;
    s.history.push({ at: Date.now(), who: name, from: old, to: next, reason });
    if (s.history.length > 200) s.history.shift();
    saveSettingsDebounced();
    render();
    inject();
    toastr.info(`${name}: rung ${old} → ${next} (${LADDER[next].name})`, 'Slow Burn Governor');
}

function onMessage() {
    const s = settings();
    if (!s.enabled || !s.autoCount) return;
    s.countA++;
    s.countB++;
    saveSettingsDebounced();
    render();
    inject();
}

/* ------------------------------------------------------------------ *
 *  UI
 * ------------------------------------------------------------------ */
function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trackHtml(which) {
    const s = settings();
    const name = which === 'a' ? s.nameA : s.nameB;
    const register = which === 'a' ? s.registerA : s.registerB;
    const rung = clampRung(which === 'a' ? s.rungA : s.rungB);
    const count = which === 'a' ? s.countA : s.countB;
    const mirror = which === 'a' ? s.mirrorA : s.mirrorB;
    const r = LADDER[rung];
    const pct = Math.round((count / Math.max(1, s.minMessages)) * 100);
    const ready = count >= s.minMessages;

    return `
    <div class="sbg-track" data-track="${which}">
        <div class="sbg-track-head">
            <input class="text_pool sbg-name" data-track="${which}" value="${esc(name)}" />
            <span class="sbg-rung-num">${rung} / ${TOP}</span>
        </div>
        <div class="sbg-rung-name">${esc(r.name)}</div>
        <div class="sbg-state">${esc(r.state)}</div>
        <input type="range" class="sbg-slider" data-track="${which}" min="0" max="${TOP}" value="${rung}" />
        <div class="sbg-meter"><div class="sbg-meter-fill ${ready ? 'sbg-ready' : ''}" style="width:${Math.min(100, pct)}%"></div></div>
        <div class="sbg-count ${ready ? 'sbg-ready-text' : ''}">${count}/${s.minMessages} messages on rung ${ready ? '— gate open' : '— locked'}</div>
        <div class="sbg-surface"><b>Surface:</b> ${esc(r.surface)}</div>
        <div class="sbg-prox"><b>Proximity:</b> ${esc(r.proximity)}</div>
        <div class="sbg-gate"><b>Gate:</b> ${esc(r.gate)}</div>
        <label>Hostility register</label>
        <textarea class="text_pool sbg-register" data-track="${which}" rows="3">${esc(register)}</textarea>
        <label class="checkbox_label sbg-mirror">
            <input type="checkbox" class="sbg-mirror-cb" data-track="${which}" ${mirror ? 'checked' : ''} />
            <span>Mirror intact (believes the other is the warden)</span>
        </label>
        <div class="sbg-btns">
            <div class="menu_button sbg-step" data-track="${which}" data-dir="-1">Back a rung</div>
            <div class="menu_button sbg-step" data-track="${which}" data-dir="1">Advance</div>
        </div>
    </div>`;
}

function render() {
    const s = settings();
    const $root = $('#sbg_body');
    if (!$root.length) return;
    $root.html(`
        ${trackHtml('a')}
        ${trackHtml('b')}
        <div class="sbg-desync">${esc(desyncClause(s))}</div>
        <hr class="sysHR">
        <label>Ceiling — nothing above this rung may be written</label>
        <select id="sbg_ceiling" class="text_pool">
            ${LADDER.map(r => `<option value="${r.n}" ${r.n === s.ceiling ? 'selected' : ''}>${r.n} — ${esc(r.name)}</option>`).join('')}
        </select>
        <label>Minimum messages per rung</label>
        <input id="sbg_min" class="text_pool" type="number" min="1" max="200" value="${s.minMessages}" />
        <label>Maximum permitted desync (rungs)</label>
        <input id="sbg_desync" class="text_pool" type="number" min="0" max="${TOP}" value="${s.maxDesync}" />
        <label>Injection depth</label>
        <input id="sbg_depth" class="text_pool" type="number" min="0" max="20" value="${s.injectDepth}" />
        <label class="checkbox_label"><input type="checkbox" id="sbg_autocount" ${s.autoCount ? 'checked' : ''} /><span>Count messages automatically</span></label>
        <div class="sbg-btns">
            <div class="menu_button" id="sbg_reset_count">Reset counters</div>
            <div class="menu_button" id="sbg_preview">Preview injection</div>
        </div>
    `);
    bind();
}

function bind() {
    const s = settings();

    $('.sbg-slider').off('change').on('change', function () {
        setRung($(this).data('track'), $(this).val(), 'slider');
    });

    $('.sbg-step').off('click').on('click', function () {
        const which = $(this).data('track');
        const dir = Number($(this).data('dir'));
        const cur = which === 'a' ? s.rungA : s.rungB;
        const count = which === 'a' ? s.countA : s.countB;
        if (dir > 0 && count < s.minMessages) {
            toastr.warning(`Rung locked: ${count}/${s.minMessages} messages served.`, 'Slow Burn Governor');
            return;
        }
        setRung(which, cur + dir, dir > 0 ? 'manual advance' : 'backslide');
    });

    $('.sbg-name').off('change').on('change', function () {
        const which = $(this).data('track');
        s[which === 'a' ? 'nameA' : 'nameB'] = $(this).val().trim() || (which === 'a' ? 'A' : 'B');
        saveSettingsDebounced(); render(); inject();
    });

    $('.sbg-register').off('change').on('change', function () {
        const which = $(this).data('track');
        s[which === 'a' ? 'registerA' : 'registerB'] = $(this).val();
        saveSettingsDebounced(); inject();
    });

    $('.sbg-mirror-cb').off('change').on('change', function () {
        const which = $(this).data('track');
        s[which === 'a' ? 'mirrorA' : 'mirrorB'] = $(this).prop('checked');
        saveSettingsDebounced(); render(); inject();
    });

    $('#sbg_ceiling').off('change').on('change', function () {
        s.ceiling = Number($(this).val());
        s.rungA = clampRung(s.rungA); s.rungB = clampRung(s.rungB);
        saveSettingsDebounced(); render(); inject();
    });

    const numeric = { sbg_min: 'minMessages', sbg_desync: 'maxDesync', sbg_depth: 'injectDepth' };
    for (const [id, key] of Object.entries(numeric)) {
        $(`#${id}`).off('change').on('change', function () {
            s[key] = Number($(this).val());
            saveSettingsDebounced(); render(); inject();
        });
    }

    $('#sbg_autocount').off('change').on('change', function () {
        s.autoCount = $(this).prop('checked'); saveSettingsDebounced();
    });

    $('#sbg_reset_count').off('click').on('click', () => {
        s.countA = 0; s.countB = 0; saveSettingsDebounced(); render(); inject();
    });

    $('#sbg_preview').off('click').on('click', () => {
        const text = buildPrompt() || '(disabled)';
        if (callGenericPopup) callGenericPopup(`<pre class="sbg-pre">${esc(text)}</pre>`, 1);
        else alert(text);
    });
}

let callGenericPopup = null;

jQuery(async () => {
    try {
        const mod = await import('../../../popup.js');
        callGenericPopup = mod.callGenericPopup;
    } catch { /* older ST — fall back to alert */ }

    $('#extensions_settings2').append(`
    <div class="sbg-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Slow Burn Governor — Dual Track</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label"><input type="checkbox" id="sbg_enabled" /><span>Enabled</span></label>
                <div id="sbg_body"></div>
            </div>
        </div>
    </div>`);

    const s = settings();
    $('#sbg_enabled').prop('checked', s.enabled).on('change', function () {
        s.enabled = $(this).prop('checked'); saveSettingsDebounced(); inject();
    });

    render();
    inject();

    eventSource.on(event_types.MESSAGE_RECEIVED, onMessage);
    eventSource.on(event_types.CHAT_CHANGED, () => { render(); inject(); });

    try {
        const { SlashCommandParser } = await import('../../../slash-commands/SlashCommandParser.js');
        const { SlashCommand } = await import('../../../slash-commands/SlashCommand.js');
        const { ARGUMENT_TYPE, SlashCommandArgument } = await import('../../../slash-commands/SlashCommandArgument.js');

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'rung',
            callback: (args, value) => {
                const st = settings();
                const parts = String(value).trim().split(/\s+/).filter(Boolean);
                if (!parts.length) return `${st.nameA}: ${st.rungA} (${LADDER[st.rungA].name}) | ${st.nameB}: ${st.rungB} (${LADDER[st.rungB].name})`;
                const which = parts[0].toLowerCase() === st.nameA.toLowerCase() ? 'a'
                    : parts[0].toLowerCase() === st.nameB.toLowerCase() ? 'b' : null;
                if (!which) return `Unknown character: ${parts[0]}`;
                if (parts[1] === undefined) {
                    const r = which === 'a' ? st.rungA : st.rungB;
                    return `${parts[0]}: rung ${r} — ${LADDER[r].name}`;
                }
                setRung(which, Number(parts[1]), 'slash command');
                return `Set ${parts[0]} to rung ${clampRung(parts[1])}`;
            },
            unnamedArgumentList: [SlashCommandArgument.fromProps({ description: 'character name, optional rung number', typeList: [ARGUMENT_TYPE.STRING], isRequired: false })],
            helpString: 'Read or set a rung. <code>/rung</code> reports both; <code>/rung Astrid 7</code> sets one.',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'ceiling',
            callback: (args, value) => {
                const st = settings();
                if (!String(value).trim()) return `Ceiling: ${st.ceiling} — ${LADDER[st.ceiling].name}`;
                st.ceiling = Math.max(0, Math.min(Number(value) || 0, TOP));
                st.rungA = clampRung(st.rungA); st.rungB = clampRung(st.rungB);
                saveSettingsDebounced(); render(); inject();
                return `Ceiling set to ${st.ceiling} — ${LADDER[st.ceiling].name}`;
            },
            unnamedArgumentList: [SlashCommandArgument.fromProps({ description: `rung number 0-${TOP}`, typeList: [ARGUMENT_TYPE.NUMBER], isRequired: false })],
            helpString: 'Read or set the hard ceiling above which nothing may be written.',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'mirror',
            callback: (args, value) => {
                const st = settings();
                const parts = String(value).trim().split(/\s+/).filter(Boolean);
                const which = parts[0]?.toLowerCase() === st.nameA.toLowerCase() ? 'a'
                    : parts[0]?.toLowerCase() === st.nameB.toLowerCase() ? 'b' : null;
                if (!which) return `Mirror — ${st.nameA}: ${st.mirrorA ? 'intact' : 'broken'} | ${st.nameB}: ${st.mirrorB ? 'intact' : 'broken'}`;
                const key = which === 'a' ? 'mirrorA' : 'mirrorB';
                st[key] = parts[1] ? parts[1].toLowerCase() === 'intact' : !st[key];
                saveSettingsDebounced(); render(); inject();
                return `${parts[0]}'s mirror is now ${st[key] ? 'intact' : 'broken'}`;
            },
            unnamedArgumentList: [SlashCommandArgument.fromProps({ description: 'character name, then intact|broken', typeList: [ARGUMENT_TYPE.STRING], isRequired: false })],
            helpString: 'Break or restore a character\'s belief that the other holds the leash.',
        }));
    } catch (e) {
        console.warn('[SBG] slash commands unavailable on this ST version', e);
    }

    console.log(`[SBG] Slow Burn Governor loaded — ${LADDER.length} rungs, dual track`);
});
