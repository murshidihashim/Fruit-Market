// Checks of the stylesheets made in the browser, on the built page (PLAN-130, A-05). They replace tests that read the
// stylesheets, and the order in which main.tsx imports them, as text: a rule can now move to another sheet, lose its
// "#app" or be merged with another, and these still hold as long as the page draws the same. Used by smoke.cjs.
//   checkStyles(browser, file)  opens the built page at four sizes, lays small pieces of the table on it in place of
//                               the app (the same classes and nesting the screens draw) and reads what the browser
//                               draws them with; then reads the page's own rules (the CSSOM, not the files) for what
//                               no rule may say. Returns every rule broken, or an empty list.
const path = require('path');

// The pieces. Each: the size it is read at ('tall' 390x844, 'short' 390x700, 'narrow' 360x640, 'reduced' 390x844 with
// reduced motion), what it shows, its markup inside the table (`.game.gx.tkt`; markup that starts with BARE is laid
// on the page as it is), and what the browser must draw: [selector, pseudo-element or '', property, test, value],
// where the test is
//   '='  the computed value is `value`;   '!='  it is not;
//   'as' it is what the same property computes to on a piece of the same place styled `property: value`;
//   '>', '<'  a number above or below `value`;
//   'starts', 'ends', 'has'  the computed value starts with, ends with or holds `value`;
//   'right of'  the element lies to the right of the one `value` selects;
//   'fills'  the element's box is the grid cell `value` (it has no size of its own);
//   'reach'  the place to tap (the element's min-height, and how far its ::before reaches above and below it, or
//            across with `value` 'across' and the width) is at least 40 px.
const BARE = '<!--bare-->';
const PIECES = [
  ['tall', 'a sheet stays in the middle cell and reaches over the rows by its margins (reach.ts)',
    '<div class="centre"><div class="mid-panel tk-panel fm-sheet sh-order" style="--rise: 30px; --drop: 20px"></div></div>', [
      ['.fm-sheet', '', 'z-index', '=', '6'], ['.fm-sheet', '', 'margin-top', '=', '-30px'],
      ['.fm-sheet', '', 'margin-bottom', '=', '-20px'], ['.fm-sheet', '', 'grid-row-start', '=', 'mid'],
    ]],
  ['short', 'the day\'s sheet on a short phone reaches over the rows above and below it',
    '<div class="centre"><div class="sh-day own" style="--rise: 30px; --drop: 20px"></div></div>', [
      ['.sh-day', '', 'z-index', '=', '6'], ['.sh-day', '', 'margin-top', '=', '-32px'], ['.sh-day', '', 'margin-bottom', '=', '-20px'],
    ]],
  ['tall', 'the day\'s sheet lies over your shelf (data-over)',
    '<div class="centre"><div class="sh-day own" data-over style="--rise: 30px; --drop: 20px"></div></div>', [
      ['.sh-day', '', 'z-index', '=', '6'], ['.sh-day', '', 'margin-bottom', '=', '-20px'],
    ]],
  ['tall', 'last of all the day\'s sheet also lies over the rows above it (data-up)',
    '<div class="centre"><div class="sh-day own" data-up style="--rise: 30px; --drop: 20px"></div></div>', [
      ['.sh-day', '', 'z-index', '=', '6'], ['.sh-day', '', 'margin-top', '=', '-32px'],
    ]],
  ['tall', 'the pricing sheet at its closest step leaves out the Favoured Trade note',
    '<div class="rush-table"><div class="rt-sheet" data-tight="3"><p class="ps-note ps-fav">f</p><p class="ps-note ps-order">o</p></div>'
      + '<div class="rt-sheet" data-tight="2"><p class="ps-note ps-fav">f</p></div></div>', [
      ['[data-tight="3"] .ps-fav', '', 'display', '=', 'none'], ['[data-tight="3"] .ps-order', '', 'display', '!=', 'none'],
      ['[data-tight="2"] .ps-fav', '', 'display', '!=', 'none'],
    ]],
  ['tall', 'the morning is drawn closer a step at a time: the event\'s picture shrinks from step 3',
    ['2', '3', '4', '5'].map((t) => `<div class="centre"><div class="morning-card tk-morning fm-sheet sh-morning" data-tight="${t}"><div class="wc wc-event"><i class="wc-evpic"></i></div></div></div>`).join(''), [
      ['[data-tight="2"] .wc-evpic', '', 'width', '!=', '104px'], ['[data-tight="3"] .wc-evpic', '', 'width', '=', '104px'],
      ['[data-tight="3"] .wc-evpic', '', 'height', '=', '76px'], ['[data-tight="4"] .wc-evpic', '', 'width', '=', '80px'],
      ['[data-tight="5"] .wc-evpic', '', 'float', '=', 'left'],
    ]],
  ['tall', 'the bid is drawn closer a step at a time: the picture from step 2, the line of what is won at step 3',
    ['1', '2', '3'].map((t) => `<div class="centre"><div class="price-panel order-panel mid-panel tk-panel fm-sheet sh-order" data-tight="${t}"><div class="wc"><i class="wc-sqpic"></i></div><div class="ob-get"><b class="tk-label">l</b></div></div></div>`).join(''), [
      ['[data-tight="1"] .wc-sqpic', '', 'width', '!=', '48px'], ['[data-tight="2"] .wc-sqpic', '', 'width', '=', '48px'],
      ['[data-tight="2"] .wc-sqpic', '', 'height', '=', '48px'], ['[data-tight="2"] .ob-get', '', 'display', '!=', 'none'],
      ['[data-tight="3"] .ob-get', '', 'display', '=', 'none'],
    ]],
  ['tall', 'the evening is drawn closer a step at a time: the favour card\'s parts from step 3, one line of each offer at step 4',
    ['', '2', '3', '4'].map((t) => `<div class="centre"><div class="mid-panel mid-evening fm-sheet sh-evening" ${t ? `data-tight="${t}"` : ''} data-s="${t || 0}">`
      + '<div class="fav-mini"><span class="fav-kind">k</span><i class="fav-pic"></i><span class="fav-tx">t</span></div>'
      + '<button type="button" class="uo uo-pick" data-x="ok"><span class="uo-kind">Upgrade</span><i class="uo-pic"></i><b class="uo-nm">n</b><span class="uo-cost">$4</span><span class="uo-tx">t</span><span class="uo-ft">Build once</span></button>'
      + '<button type="button" class="uo uo-pick" data-x="no" aria-disabled="true" disabled><span class="uo-kind">Upgrade</span><i class="uo-pic"></i><b class="uo-nm">n</b><span class="uo-cost">$9</span><span class="uo-tx">t</span><span class="uo-ft">Needs $9</span></button>'
      + '</div></div>').join(''), [
      ['[data-s="2"] .fav-kind', '', 'display', '!=', 'none'],
      ...['fav-kind', 'fav-pic', 'fav-tx'].map((c) => [`[data-s="3"] .${c}`, '', 'display', '=', 'none']),
      ['[data-s="4"] [data-x="ok"] .uo-tx', '', 'white-space', '=', 'nowrap'], ['[data-s="4"] [data-x="ok"] .uo-tx', '', 'overflow-x', '=', 'hidden'],
      ['[data-s="4"] [data-x="ok"] .uo-tx', '', 'text-overflow', '=', 'ellipsis'], ['[data-s="4"] [data-x="ok"] .uo-tx', '', 'margin-left', '=', '-56px'],
      ['[data-s="4"] [data-x="ok"] .uo-kind', '', 'display', '=', 'none'], ['[data-s="4"] [data-x="ok"] .uo-ft', '', 'display', '=', 'none'],
      // an offer that cannot be built still says why under its one line, and is drawn greyed but for its band and its reason
      ['[data-s="4"] [data-x="no"] .uo-ft', '', 'display', '=', 'block'],
      ...['uo-pic', 'uo-nm', 'uo-cost', 'uo-tx'].map((c) => [`[data-s="0"] [data-x="no"] .${c}`, '', 'opacity', '=', '0.5']),
      ['[data-s="0"] [data-x="no"] .uo-kind', '', 'opacity', '=', '1'], ['[data-s="0"] [data-x="no"] .uo-ft', '', 'opacity', '=', '1'],
      ['[data-s="0"] [data-x="ok"] .uo-tx', '', 'opacity', '=', '1'],
    ]],
  ['tall', 'the evening\'s foot: a night that still scrolls says so, and two buttons take the bar\'s own height',
    '<div class="centre"><div class="mid-panel mid-evening fm-sheet sh-evening" data-more data-two style="--drop: 20px"><i class="ev-more" data-x="more"></i></div>'
      + '<div class="mid-panel mid-evening fm-sheet sh-evening" data-x="plain"><i class="ev-more" data-x="none"></i></div>'
      + '<div class="pp-lock ev-lock" data-two></div><div class="cd-pop ev-card"></div></div>', [
      ['[data-x="more"]', '::before', 'content', '=', '""'], ['[data-x="more"]', '::before', 'height', '=', '22px'],
      ['[data-x="none"]', '::before', 'content', '=', 'none'],
      ['.sh-evening[data-two]', '', 'margin-bottom', '=', '34px'],
      ['.ev-lock', '', 'z-index', '=', '6'], ['.ev-lock', '', 'margin-top', '=', '-54px'],
      // an offer's whole card, opened from its compact line, lies over the whole screen
      ...['top', 'right', 'bottom', 'left', 'margin-top'].map((p) => ['.ev-card', '', p, '=', '0px']),
      ['.ev-card', '', 'position', '=', 'fixed'], ['.ev-card', '', 'z-index', '=', '30'],
    ]],
  ['tall', 'the question at a tie lies in the round table\'s foot, "Play it" first in the page and drawn on the right',
    '<div class="rush-table"><div class="rt-foot"><div class="pp-lock ds-tie-lock"><button type="button" class="btn primary wide big" data-x="play">Play it</button>'
      + '<button type="button" class="btn ghost wide big" data-x="keep">Keep it</button></div></div></div>', [
      ['.ds-tie-lock', '', 'display', '=', 'flex'], ['.ds-tie-lock', '', 'flex-direction', '=', 'row-reverse'],
      ['.ds-tie-lock', '', 'flex-grow', '=', '1'], ['[data-x="play"]', '', 'left', 'right of', '[data-x="keep"]'],
    ]],
  ['tall', 'the picture of a sheet that has just left lies in the panels\' cell, under them, and takes no taps',
    '<div class="centre"><div class="tk-sheet" aria-hidden="true"></div><div class="mid-panel" data-x="p"></div>'
      + '<div class="morning-card" data-x="m"></div><div class="sales-card" data-x="s"></div></div>', [
      ['.tk-sheet', '', 'z-index', '=', '3'], ['.tk-sheet', '', 'pointer-events', '=', 'none'],
      ['.tk-sheet', '', 'min-height', '=', '0px'], ['.tk-sheet', '', 'grid-row-start', '=', 'mid'], ['.tk-sheet', '', 'box', 'fills', 'mid'],
      ...['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'].map((p) => ['.tk-sheet', '', p, '=', '0px']),
      ...['p', 'm', 's'].map((x) => [`[data-x="${x}"]`, '', 'z-index', '>', 3]),
    ]],
  ['tall', 'when many pieces move, the later copies are drawn without their shadow',
    '<div class="fx-layer"><div class="sprite mv" data-x="a"></div><div class="sprite mv plain" data-x="b"></div></div>', [
      ['[data-x="a"]', '', 'filter', '!=', 'none'], ['[data-x="b"]', '', 'filter', '=', 'none'],
    ]],
  ['tall', 'a pop-up\'s main button on the table is drawn as the pop-ups\' own (ticket-ui.css comes after ticket.css)',
    '<div class="modal"><button type="button" class="btn primary" data-x="go">Go</button></div>', [
      ['[data-x="go"]', '', 'color', 'as', 'var(--x-mustard)'], ['[data-x="go"]', '', 'background-color', 'as', 'var(--x-ink)'],
      ['[data-x="go"]', '', 'font-family', 'as', 'var(--f-display)'],
    ]],
  ['tall', 'the night comes in by its own animation',
    '<div class="centre"><div class="tk-night"><b>n</b></div></div>', [
      ['.tk-night', '', 'animation-name', '=', 'tk-dusk'],
    ]],
  ['tall', 'at night the customer row and the stalls stay on the table, dimmed, and the lanes\' pieces and your shelf\'s chips slide on the night\'s curve',
    `${BARE}<div class="game gx tkt is-night"><div class="street-wrap" data-x="row"><div class="street"></div></div><div class="seats" data-x="seats"></div>`
      + '<div class="tb-lane"><i class="tb-pc ns-piece" data-x="pc"></i></div><div class="tb-dock night"><i class="tb-chip" data-x="chip"></i></div></div>', [
      ['[data-x="row"]', '', 'display', '=', 'block'], ['[data-x="row"]', '', 'opacity', '<', 1],
      ['[data-x="seats"]', '', 'display', '=', 'flex'], ['[data-x="seats"]', '', 'opacity', '<', 1],
      ['[data-x="pc"]', '', 'transition-timing-function', 'starts', 'cubic-bezier(0.45, 0, 0.3, 1)'],
      ['[data-x="chip"]', '', 'transition-timing-function', 'starts', 'cubic-bezier(0.45, 0, 0.3, 1)'],
    ]],
  ['reduced', 'with reduced motion nothing moves and the "LAST DAY" stamp is simply there',
    '<div class="centre"><div class="tk-night"><b>n</b></div><div class="phase-banner">LAST DAY</div></div>', [
      ['.tk-night', '', 'animation-name', '=', 'none'], ['.tk-night > b', '', 'animation-name', '=', 'none'],
      ['.game', '', 'transition-property', '=', 'none'], ['.phase-banner', '', 'opacity', '=', '1'],
    ]],
  // the small gaps on the phone (PLAN-096)
  ['tall', 'the morning drawn closer: every step keeps the steps before it, and the event\'s picture only shrinks',
    ['0', '2', '3', '4', '5'].map((t) => `<div class="centre"><div class="morning-card tk-morning fm-sheet sh-morning"${t !== '0' ? ` data-tight="${t}"` : ''} data-s="${t}">`
      + '<div class="wc wc-event"><div class="wc-main"><b class="wc-ttl">Monsoon Downpour</b><span class="wc-flavour">f</span></div><i class="wc-evpic"></i>'
      + '<div class="wc-lt"><span class="wc-lt-h">a</span><span class="wc-lt-l">b</span></div></div></div></div>').join(''), [
      ['[data-s="0"] .wc-flavour', '', 'display', '!=', 'none'],
      ...['2', '3', '4', '5'].flatMap((t) => [[`[data-s="${t}"] .wc-flavour`, '', 'display', '=', 'none'],
        [`[data-s="${t}"] .wc-lt-l`, '', 'height', '=', '16px'], [`[data-s="${t}"] .wc-ttl`, '', 'font-size', '=', '18px']]),
      ['[data-s="3"] .wc-evpic', '', 'width', '=', '104px'], ['[data-s="3"] .wc-evpic', '', 'height', '=', '76px'],
      ...['4', '5'].flatMap((t) => [[`[data-s="${t}"] .wc-evpic`, '', 'width', '=', '80px'], [`[data-s="${t}"] .wc-evpic`, '', 'height', '=', '58px']]),
      // step 5: the event's words flow round its picture
      ['[data-s="5"] .wc-evpic', '', 'float', '=', 'left'], ['[data-s="5"] .wc-evpic', '', 'margin-right', '=', '8px'],
      ['[data-s="5"] .wc-evpic', '', 'margin-bottom', '=', '4px'],
    ]],
  ['tall', 'the event chip in the top bar shows its whole name: the picture gives way first, and the yellow is 36 px in a place to tap of 40',
    '<div class="tk-top"><button type="button" class="tk-event"><span class="xev"></span><span>Monsoon Downpour</span></button></div>', [
      ['.tk-event', '', 'flex-direction', '=', 'row-reverse'], ['.tk-event', '', 'flex-wrap', '=', 'wrap'],
      ['.tk-event', '', 'overflow-y', '=', 'hidden'], ['.tk-event', '', 'height', '=', '40px'], ['.tk-event .xev', '', 'order', '=', '1'],
      ['.tk-event > span:last-child', '', 'min-width', '=', 'min-content'], ['.tk-event', '::before', 'height', '=', '30px'],
      ['.tk-event', '', 'border-top-width', '=', '2px'], ['.tk-event', '', 'border-bottom-width', '=', '2px'],
      ['.tk-event', '', 'border-top-color', '=', 'rgba(0, 0, 0, 0)'], ['.tk-event', '', 'background-clip', '=', 'padding-box'],
      ['.tk-event', '', 'background-color', 'as', 'var(--tk-yel)'],
    ]],
  ['tall', 'the pricing sheet\'s − and + are places to tap of 40 px at every step, without moving a row',
    ['', '1', '2', '3'].map((t) => `<div class="rush-table"><div class="rt-sheet"${t ? ` data-tight="${t}"` : ''} data-s="${t || 0}"><div class="ps-head"><button type="button" class="pp-info">i</button></div>`
      + '<div class="ps-in"><div class="ps-rows n2"><span class="ds-dial"><button type="button" class="ds-st">−</button><b class="ds-amt">3</b><button type="button" class="ds-st">+</button></span></div></div></div></div>').join(''), [
      ...['0', '1', '2', '3'].map((t) => [`[data-s="${t}"] .ds-st`, '', 'height', 'reach', '']),
      ['[data-s="0"] .ds-st', '', 'min-height', '=', '40px'], ['[data-s="1"] .ds-st', '', 'min-height', '=', '36px'],
      ['[data-s="2"] .ds-st', '', 'min-height', '=', '34px'], ['[data-s="3"] .ds-st', '', 'min-height', '=', '34px'],
      // the area reaches over the row's own 2 px edge, and at the closest steps over half the 2 px between two rows
      ...['2', '3'].flatMap((t) => [[`[data-s="${t}"] .ps-in`, '', 'row-gap', '=', '2px'], [`[data-s="${t}"] .ps-rows`, '', 'row-gap', '=', '2px'],
        [`[data-s="${t}"] .ps-rows`, '', 'padding-top', '=', '1px'], [`[data-s="${t}"] .ps-rows`, '', 'margin-top', '=', '-1px'],
        [`[data-s="${t}"] .ds-st`, '::before', 'top', '=', '-3px']]),
      ['[data-s="0"] .ds-dial > .ds-st:first-child', '::before', 'left', '=', '-2px'], ['[data-s="0"] .ds-dial > .ds-st:last-child', '::before', 'right', '=', '-2px'],
      // the "i" beside the heading
      ['[data-s="0"] .pp-info', '', 'height', 'reach', ''], ['[data-s="0"] .pp-info', '', 'width', 'reach', 'across'],
    ]],
  ['narrow', 'on a narrow phone the pricing sheet\'s − and + are 38 px across, with 2 px more on the outer side of each',
    '<div class="rush-table"><div class="rt-sheet"><div class="ps-in"><div class="ps-rows n2"><span class="ds-dial"><button type="button" class="ds-st">−</button><b class="ds-amt">3</b><button type="button" class="ds-st">+</button></span></div></div></div></div>', [
      ['.ds-st', '', 'width', '=', '38px'], ['.ds-dial > .ds-st:first-child', '::before', 'left', '=', '-2px'],
    ]],
  // PLAN-131: iPhone Safari waits on, or swallows, a quick second tap unless the page says a double tap is not a zoom
  ['tall', 'a quick second tap on − and +, or on Ring the bell, is a tap: no double-tap zoom on them or on anything round them',
    '<div class="rush-table"><div class="rt-sheet"><div class="ps-in"><div class="ps-rows n2"><div class="ps-row"><span class="ds-dial"><button type="button" class="ds-st">−</button><span class="ds-tag"><span class="ds-tag-face">$4</span></span><button type="button" class="ds-st">+</button></span></div></div></div>'
      + '<div class="pp-lock"><button type="button" class="btn primary big wide tk-go">Ring the bell</button></div></div></div>'
      + '<div class="centre"><div class="mid-panel sh-day own"><div class="ds-rows"><div class="ds-row"><span class="mini-step"><button type="button" class="ds-st">+</button></span></div></div></div></div>', [
      ['.rt-sheet .ds-st', '', 'touch-action', '=', 'manipulation'], ['.sh-day .ds-st', '', 'touch-action', '=', 'manipulation'],
      ['.pp-lock .btn', '', 'touch-action', '=', 'manipulation'], ['.rt-sheet', '', 'touch-action', '=', 'manipulation'],
      ['.ds-tag-face', '', 'touch-action', '=', 'manipulation'], ['.ds-tag-face', '', 'user-select', '=', 'none'],
      // at rest the buttons are drawn as they were
      ['.rt-sheet .ds-st', '', 'background-color', 'as', 'var(--tk-ink)'], ['.rt-sheet .ds-st', '', 'color', 'as', 'var(--tk-yel)'],
      ['.sh-day .ds-st', '', 'background-color', 'as', 'var(--tk-ink)'], ['.pp-lock .btn', '', 'opacity', '=', '1'],
    ]],
  ['tall', 'the stocking sheet\'s − and + are places to tap of 40 px at every step, without moving a row',
    ['', '1', '2', '3'].map((t) => `<div class="centre"><div class="mid-panel sh-day own"${t ? ` data-tight="${t}"` : ''} data-s="${t || 0}"><div class="ds-rows"><div class="ds-row">`
      + '<span class="mini-step"><button type="button" class="ds-st">−</button><b class="ds-amt">1</b><button type="button" class="ds-st">+</button></span></div></div></div></div>').join(''), [
      ...['0', '1', '2', '3'].map((t) => [`[data-s="${t}"] .ds-st`, '', 'height', 'reach', '']),
      ['[data-s="0"] .ds-st', '', 'min-height', '=', '44px'], ['[data-s="1"] .ds-st', '', 'min-height', '=', '38px'],
      ['[data-s="2"] .ds-st', '', 'min-height', '=', '36px'], ['[data-s="3"] .ds-st', '', 'min-height', '=', '34px'],
      // at the closest step the rows stand 4 px apart: the areas reach 1 px into the gap from each side
      ['[data-s="1"] .ds-rows', '', 'row-gap', '=', '4px'], ['[data-s="3"] .ds-st', '::before', 'top', '=', '-3px'],
      ['[data-s="0"] .mini-step > .ds-st:first-child', '::before', 'left', '=', '-2px'],
    ]],
  ['narrow', 'on a narrow phone the stocking sheet\'s − and + are 40 px across',
    '<div class="centre"><div class="mid-panel sh-day own"><div class="ds-rows"><div class="ds-row"><span class="mini-step"><button type="button" class="ds-st">−</button><b class="ds-amt">1</b><button type="button" class="ds-st">+</button></span></div></div></div></div>', [
      ['.ds-st', '', 'width', '=', '40px'],
    ]],
  // the cards (cards.css, also read alone by the print sheets): sizes in the card's own unit, one card wide 252 px
  ['tall', 'every customer card has the same picture box, and an event card one picture size, one box height and a title of one line (PLAN-106)',
    `${BARE}<div>${[1, 2].map((k) => `<article class="cd cd-a cd-cust" style="--card-w: ${252 * k}px" data-k="${k}"><div class="cd-mpic"></div></article>`
      + `<article class="cd cd-a cd-event" style="--card-w: ${252 * k}px" data-e="${k}"><strong class="cd-ttl">Monsoon Downpour</strong><div class="cd-pic"></div>`
      + '<div class="cd-two cd-fx"><div class="cd-blk cd-blk-k" data-x="fx">a</div></div><div class="cd-two cd-lims"><div class="cd-blk" data-x="lim">b</div></div></article>').join('')}</div>`, [
      ...[1, 2].flatMap((k) => [[`[data-k="${k}"] .cd-mpic`, '', 'height', '=', `${125 * k}px`], [`[data-e="${k}"] .cd-pic`, '', 'height', '=', `${97 * k}px`],
        [`[data-e="${k}"] .cd-ttl`, '', 'height', '=', `${29.5 * k}px`], [`[data-e="${k}"] [data-x="fx"]`, '', 'height', '=', `${56 * k}px`],
        [`[data-e="${k}"] [data-x="lim"]`, '', 'height', '=', `${56 * k}px`]]),
      ['[data-k="1"] .cd-mpic', '', 'flex-grow', '=', '0'], ['[data-k="1"] .cd-mpic', '', 'flex-shrink', '=', '0'], ['[data-k="1"] .cd-mpic', '', 'min-height', '=', 'auto'],
      ['[data-e="1"] .cd-pic', '', 'flex-grow', '=', '0'], ['[data-e="1"] .cd-pic', '', 'flex-shrink', '=', '0'], ['[data-e="1"] .cd-pic', '', 'min-height', '=', '0px'],
      ['[data-e="1"] .cd-ttl', '', 'display', '=', 'flex'], ['[data-e="1"] .cd-ttl', '', 'align-items', '=', 'center'], ['[data-e="1"] .cd-ttl', '', 'white-space', '=', 'nowrap'],
      // a box is half the row, also alone
      ['[data-e="1"] [data-x="fx"]', '', 'width', 'half row', 5],
    ]],
  ['tall', 'the customer\'s price badge wears the ink, not a customer type\'s colour (C-08)',
    `${BARE}<div class="cd"><span class="cd-pb cd-pb-customer"></span></div>`, [
      ['.cd-pb-customer', '', '--pay', 'as', 'var(--x-ink)'],
    ]],
  ['tall', 'the place a customer left in the row says they are at the stalls, and is not read aloud (PLAN-123)',
    '<div class="street"><div class="cust rush-away" style="--rt-at: &quot;Farid&quot;"></div></div>', [
      ['.cust', '::after', 'content', 'ends', '/ ""'], ['.cust', '::after', 'content', 'has', 'at the stalls'],
    ]],
];

// Faint words and marks are dark enough to read: 4.5 to 1 against what they lie on. Each: what it is, its markup in the
// table (or BARE), and the two colours, each [selector, property] or a colour of the palette.
const PAPER = 'var(--tk-paper)', INK = 'var(--tk-ink)', KRAFT = 'var(--tk-kraft)', MUSTARD = 'var(--tk-yel)';
const READABLE = [
  ['an empty market box: its freshness letters', '<div class="tb-box"><span class="tk-lamp">R</span></div>', ['.tk-lamp', 'color'], PAPER],
  ['an empty market box: its price', '<div class="tb-box"><b class="price">$4</b></div>', ['.price', 'color'], PAPER],
  ['the rush: a freshness the customer will not take', '<i class="rt-lamp off">O</i>', ['.rt-lamp', 'color'], PAPER],
  ['the rush: a sold-out crate\'s tags', '<div class="rt-crate over"><b class="rt-tag">$5</b></div>', ['.rt-tag', 'color'], PAPER],
  ['the rush: what a stall was paid', '<span class="rt-plus">+$5</span>', PAPER, ['.rt-plus', 'background-color']],
  ['the watermelon lane\'s heading', '<div class="tb-lane watermelon"><button type="button" class="tb-lh">2</button></div>', PAPER, ['.tb-lh', 'background-color']],
  ['the apple lane\'s heading', '<div class="tb-lane apple"><button type="button" class="tb-lh">2</button></div>', PAPER, ['.tb-lh', 'background-color']],
  ['the mango lane\'s heading', '<div class="tb-lane mango"><button type="button" class="tb-lh">2</button></div>', ['.tb-lh', 'color'], ['.tb-lh', 'background-color']],
  ['tomorrow\'s lorry', '<div class="tomorrow"><span class="tm-lorry">lorry</span></div>', ['.tm-lorry', 'color'], KRAFT],
  ['an empty crate', '<span class="ds-none">none</span>', ['.ds-none', 'color'], KRAFT],
  ['the rest of tomorrow, in the evening', '<p class="ev-rest">rest</p>', ['.ev-rest', 'color'], KRAFT],
  ['a − or + that cannot be pressed (pricing)', '<div class="rt-sheet"><button type="button" class="ds-st" disabled>+</button></div>', ['.ds-st', 'color'], ['.ds-st', 'background-color']],
  ['a − or + that cannot be pressed (stocking)', '<div class="sh-day"><button type="button" class="ds-st" disabled>+</button></div>', ['.ds-st', 'color'], ['.ds-st', 'background-color']],
  ['a good chip', '<span class="tk-chip good">good</span>', PAPER, ['.tk-chip', 'background-color']],
  ['a warning chip', '<span class="tk-chip warn">warn</span>', PAPER, ['.tk-chip', 'background-color']],
  ['the last day\'s day pill (PLAN-127)', '<div class="tk-day last"><span class="tk-pill">D7</span></div>', ['.tk-pill', 'color'], ['.tk-pill', 'background-color']],
  ['a standing order due today: "Order"', '<div class="order-strip due"><span class="os-k">Order</span></div>', ['.os-k', 'color'], MUSTARD],
  ['a standing order due today: its stake', '<div class="order-strip due"><span class="os-fine">stake $3</span></div>', ['.os-fine', 'color'], MUSTARD],
  ['a raised price on a customer\'s ticket', '<div class="tkc-rw up"><b>$5</b></div>', ['.tkc-rw > b', 'color'], PAPER],
  ['money made, in the takings', '<div class="tg-row"><b class="good">$5</b></div>', ['.tg-row > b', 'color'], PAPER],
  ['money that floats up', '<div class="floattext">+$5</div>', ['.floattext', 'color'], PAPER],
  ['the night\'s grey for an empty box, on the dark table', '<div class="tb-night"><div class="tb-box"><span class="tk-lamp">R</span></div></div>', ['.tk-lamp', 'color'], INK],
  ['the stamp book\'s later ranks', `${BARE}<div class="sbk"><div class="sbk-rk later"><b class="sbk-n">3</b></div></div>`, ['.sbk-n', 'color'], ['.sbk-n', 'background-color']],
];

// The takings drawn closer: every step changes how something on the sheet is drawn.
const TAKINGS = '<div class="tg-strip"><b class="tk-label">l</b><span class="tg-queue"><i class="tg-face"></i></span></div>'
  + '<div class="tg-led"><div class="tg-hd"><span>Day 1</span><b>3 days to go</b></div><div class="tg-rows ledger"><div class="tg-row tg-sales">Sales <b class="good">$5</b></div></div>'
  + '<div class="tg-net">Up today <b class="good">$5</b></div></div>'
  + '<div class="tg-stalls"><div class="tg-lab"><b class="tk-label">l</b><span>s</span></div><ol class="tg-list"><li class="tg-li"><button type="button" class="tg-stall me">'
  + '<i class="tg-pl">1</i><i class="xf"></i><span class="tg-name">You</span><b class="tg-cash">$5</b></button></li></ol></div>'
  + '<div class="tg-won"><b class="tg-tag">Favour won</b><i class="x-art"></i><span>t</span></div>'
  + '<div class="tg-shelf"><div class="tg-lab"><b class="tk-label">l</b></div><div class="tg-chips"><span class="tg-chip">c</span></div></div>';

/** In the page: lays each piece out and reads it. */
function readPieces({ pieces, takings, readable, bare, size }) {
  const out = [];
  const app = document.getElementById('app');
  const put = (html) => { app.innerHTML = html.startsWith(bare) ? html : `<div class="game gx tkt">${html}</div>`; return app.firstElementChild; };
  for (const [sizes, what, html, wants] of pieces) {
    if (sizes !== size) continue;
    const game = put(html);
    for (const [sel, pseudo, prop, test, value] of wants) {
      let said = value;
      const el = game.matches(sel) ? game : game.querySelector(sel);
      if (!el) { out.push(`${what}: nothing drawn for ${sel}`); continue; }
      const got = getComputedStyle(el, pseudo || null).getPropertyValue(prop);
      let ok;
      if (test === '=') ok = got === value;
      else if (test === '!=') ok = got !== value;
      else if (test === '>') ok = Number(got) > value;
      else if (test === 'as') {
        const probe = document.createElement(el.tagName);
        probe.className = el.className;
        probe.style.setProperty(prop, value, 'important');
        el.after(probe);
        const want = getComputedStyle(probe).getPropertyValue(prop);
        probe.remove();
        ok = got === want;
        if (!ok) said = `${value} (${want})`;
      } else if (test === 'right of') {
        const other = game.querySelector(value);
        ok = !!other && el.getBoundingClientRect().left > other.getBoundingClientRect().left;
      } else if (test === 'fills') {
        // the element's box is its grid cell's: an empty piece with no style of its own, put in the same cell
        const probe = document.createElement('div');
        probe.style.cssText = `all: unset; display: block; grid-area: ${value}; min-width: 0; min-height: 0`;
        game.append(probe);
        const [a, b] = [el.getBoundingClientRect(), probe.getBoundingClientRect()];
        probe.remove();
        ok = b.height > 0 && ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.5);
        if (!ok) said = `the ${value} cell (${Math.round(b.width)}x${Math.round(b.height)}, the element ${Math.round(a.width)}x${Math.round(a.height)})`;
      } else if (test === '<') {
        ok = got !== '' && Number(got) < value;
      } else if (test === 'ends' || test === 'has' || test === 'starts') {
        ok = test === 'ends' ? got.endsWith(value) : test === 'starts' ? got.startsWith(value) : got.includes(value);
      } else if (test === 'half row') {
        // half of its row's width less the gap between two boxes (`value` px), with or without a box beside it
        const row = el.parentElement, rs = getComputedStyle(row);
        const inner = row.clientWidth - Number.parseFloat(rs.paddingLeft) - Number.parseFloat(rs.paddingRight);
        const want = (inner - value) / 2;
        ok = Math.abs(el.getBoundingClientRect().width - want) < 0.5;
        if (!ok) said = `${want.toFixed(1)} px, half its row (${Math.round(el.getBoundingClientRect().width)} px)`;
      } else if (test === 'reach') {
        // its own box, and the unseen area laid over it (::before) beyond it on both sides
        const r = el.getBoundingClientRect(), area = getComputedStyle(el, '::before');
        const [a, b, own] = value === 'across' ? ['left', 'right', r.width] : ['top', 'bottom', r.height];
        const px = (v) => (/^-?[\d.]+px$/.test(v) ? Number.parseFloat(v) : 0);
        const reach = Math.round(own - Math.min(0, px(area.getPropertyValue(a))) - Math.min(0, px(area.getPropertyValue(b))));
        ok = area.getPropertyValue('content') !== 'none' && reach >= 40 || own >= 40;
        if (!ok) said = `a place to tap of 40 px (${Math.round(own)} px and its area ${reach} px)`;
      }
      if (!ok) out.push(`${what}: ${sel}${pseudo} ${prop} is ${JSON.stringify(got)}, wanted ${test} ${said}`);
    }
  }
  if (size === 'tall') {
    // faint words and marks against what they lie on
    const rgb = (c) => { const m = /^rgba?\(([^)]+)\)$/.exec(c); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
    const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    for (const [what, html, fg, bg] of readable) {
      const game = put(html);
      const colour = (spec) => {
        if (typeof spec !== 'string') { const el = game.querySelector(spec[0]); return el ? getComputedStyle(el).getPropertyValue(spec[1]) : `nothing drawn for ${spec[0]}`; }
        const probe = document.createElement('i');
        probe.style.color = spec;
        game.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      };
      const [a, b] = [colour(fg), colour(bg)].map((c) => ({ c, v: rgb(c) }));
      if (!a.v || !b.v || a.v.a < 1 || b.v.a < 1) { out.push(`${what}: the colours are not both solid (${a.c} on ${b.c})`); continue; }
      const [x, y] = [lum(a.v), lum(b.v)];
      const ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      if (ratio < 4.5) out.push(`${what}: ${a.c} on ${b.c} is ${ratio.toFixed(2)} to 1, under 4.5`);
    }
    // the takings: a rule for every step of drawing closer, each changing something the step before did not
    const PROPS = ['display', 'width', 'height', 'min-height', 'padding-top', 'padding-bottom', 'margin-top', 'gap', 'font-size', 'border-top-width', 'max-width'];
    const look = (tight) => {
      const game = put(`<div class="centre"><div class="sales-card"${tight ? ` data-tight="${tight}"` : ''}>${takings}</div></div>`);
      return [...game.querySelectorAll('.sales-card *')].map((el) => { const cs = getComputedStyle(el); return PROPS.map((p) => cs.getPropertyValue(p)).join('|'); }).join('\n');
    };
    let before = look('');
    for (const step of ['1', '2', '3', '4']) {
      const now = look(step);
      if (now === before) out.push(`the takings drawn closer: step ${step} draws nothing differently from the step before`);
      before = now;
    }
  }
  app.innerHTML = '';
  return out;
}

/** In the page: what no rule of the page's own stylesheets may say. */
function readRules() {
  const out = [];
  const rules = [];
  const walk = (list, media) => {
    for (const r of list) {
      if (r instanceof CSSStyleRule) rules.push({ sel: r.selectorText, style: r.style, text: r.cssText, media });
      if (r.cssRules && !(r instanceof CSSKeyframesRule)) walk(r.cssRules, r.conditionText ?? media);
    }
  };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, ''); } catch { out.push('a stylesheet of the page could not be read'); } }
  if (rules.length < 500) out.push(`only ${rules.length} style rules were found on the page`);
  const root = getComputedStyle(document.documentElement);
  // every length a rule reads from the clock is one the page sets (motion.ts writes them, with the speed --mk)
  const lengths = new Set();
  for (const r of rules) for (const m of r.text.matchAll(/var\(--t-([a-z-]+)/g)) lengths.add(m[1]);
  for (const name of lengths) if (!root.getPropertyValue(`--t-${name}`).trim()) out.push(`a rule reads --t-${name}, which the page does not set`);
  if (!lengths.size) out.push('no rule reads a length from the clock');
  // the two older names for the speed (the rush only, the night only) are gone
  for (const r of rules) if (/--rs-k|--ns-k/.test(r.text)) out.push(`${r.sel}: reads an old speed (--rs-k or --ns-k)`);
  // the old rows and the bell's sheet are gone (PLAN-096, PLAN-099), the question at a tie is the round table's, and
  // the steps of drawing closer are data-tight
  const OLD = /\.(?:tk-news[\w-]*|ds-stall|ds-bell|ds-pz|ds-price|ds-brief|ds-rivals|tight-\d+)(?![\w-])|\.sh-day\.full(?![\w-])/;
  for (const r of rules) if (OLD.test(r.sel)) out.push(`${r.sel}: styles a part no screen draws any more`);
  for (const r of rules) if (r.sel.split(',').some((s) => /sh-day/.test(s) && /\.ds-tie(?![\w-])/.test(s))) out.push(`${r.sel}: the day's sheet asks the question at a tie again`);
  // the round table and the night: colours from the palette, and every move read from the one clock
  const CLOCK = /calc\(\s*var\(--mk,\s*1\)\s*\*\s*var\(--t-([a-z-]+)\)\s*\)/g;
  const TIME = /(^|[\s,(])[-+]?(\d*\.)?\d+m?s(?![\w-])/;
  const used = { table: new Set(), night: new Set() };
  for (const r of rules) {
    const where = /rush-table|\.rt-|ds-tie-lock/.test(r.sel) ? 'table' : /tk-night/.test(r.sel) ? 'night' : '';
    if (!where) continue;
    if (where === 'table' && /#[0-9a-f]{3,8}(?![\w-])|rgba?\(|hsla?\(/i.test(r.style.cssText)) out.push(`${r.sel}: a colour of its own, not the palette's`);
    const still = { animation: r.style.getPropertyValue('animation-name') === 'none', transition: r.style.getPropertyValue('transition-property') === 'none' };
    for (const p of ['animation', 'transition', 'animation-duration', 'animation-delay', 'transition-duration', 'transition-delay']) {
      if (still[p.split('-')[0]]) continue;
      const v = r.style.getPropertyValue(p).trim();
      if (!v || /^(none|initial|inherit|unset)$/.test(v)) continue;
      for (const m of v.matchAll(CLOCK)) used[where].add(m[1]);
      // (a zero is no length: the browser writes out a delay of 0s for a shorthand that names none)
      if (TIME.test(v.replace(CLOCK, ' ').replace(/(^|[\s,(])[-+]?0*\.?0+m?s(?![\w-])/g, ' '))) out.push(`${r.sel}: ${p} has a length of its own (${v})`);
      else if (!CLOCK.test(v) && !/^(0s|0ms)$/.test(v)) out.push(`${r.sel}: ${p} is not read from the clock (${v})`);
      CLOCK.lastIndex = 0;
    }
  }
  for (const name of ['rush-rows', 'sheet-in', 'sheet-out']) if (!used.table.has(name)) out.push(`the round table no longer moves by --t-${name}`);
  for (const name of ['dusk', 'rise-after']) if (!used.night.has(name)) out.push(`the night no longer moves by --t-${name}`);
  // the day's sheet is drawn closer by its own steps (daySheet.ts), not by the screen's height: the only height at which
  // its rules change is where the sheet lies on a short phone
  for (const r of rules) if (/sh-day/.test(r.sel) && /max-height/.test(r.media)) {
    const hs = [...r.media.matchAll(/max-height:\s*(\d+)px/g)].map((m) => m[1]);
    if (hs.some((x) => x !== '760')) out.push(`${r.sel}: changes at a screen height of ${hs.join(', ')}px`);
  }
  // the market, the lorry, the card turn and the night follow the one speed too
  for (const name of ['turn', 'travel', 'lorry', 'lorry-off', 'sky', 'dusk']) {
    const read = new RegExp(`var\\(--mk,\\s*1\\)\\s*\\*\\s*var\\(--t-${name}\\)`);
    if (!rules.some((r) => ['animation', 'transition'].some((p) => read.test(r.style.getPropertyValue(p))))) out.push(`no move on the table is timed by --t-${name} times --mk`);
  }
  // the table's own moves (tb-...) are by position, size and fade only: no keyframe of theirs changes a colour or a
  // layout property
  const frames = [];
  const walkFrames = (list) => { for (const r of list) { if (r instanceof CSSKeyframesRule) frames.push(r); else if (r.cssRules) walkFrames(r.cssRules); } };
  for (const sh of document.styleSheets) { try { walkFrames(sh.cssRules); } catch { /* reported above */ } }
  const table = frames.filter((f) => f.name.startsWith('tb-'));
  if (table.length < 4) out.push(`only ${table.length} of the table's own animations (tb-...) were found`);
  for (const f of table) for (const k of f.cssRules) for (const p of k.style) if (/^(width|height|margin|padding|top|left|background|color)/.test(p)) out.push(`@keyframes ${f.name} changes ${p}`);
  // one rule sizes a customer card's picture box, whatever the card wants (PLAN-106)
  const mpic = rules.filter((r) => /\.cd-mpic(?![\w-])/.test(r.sel));
  if (mpic.length !== 1) out.push(`${mpic.length} rules style a customer card's picture box (${mpic.map((r) => r.sel).join(' | ')})`);
  // a price's badge never wears a customer type's colour (C-08)
  for (const r of rules) if (/\.cd-pb/.test(r.sel) && /--x-(everyday|premium|bargain)/.test(r.style.cssText)) out.push(`${r.sel}: a price's badge in a customer type's colour`);
  // the old "patterns" setting is read by no rule (PLAN-110)
  for (const r of rules) if (/patterns/i.test(r.text)) out.push(`${r.sel}: styles the old patterns setting`);
  // the morning drawn closer puts away its tagline only (from step 2); the later steps hide nothing (PLAN-096)
  const each = (sel) => { const parts = []; let depth = 0, at = 0; [...sel].forEach((ch, i) => { if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && !depth) { parts.push(sel.slice(at, i)); at = i + 1; } }); return [...parts, sel.slice(at)].map((s) => s.trim()); };
  for (const r of rules) if (/sh-morning/.test(r.sel) && r.style.getPropertyValue('display') === 'none') {
    for (const s of each(r.sel)) if (/sh-morning/.test(s) && !/\.wc-flavour$/.test(s)) out.push(`${s}: the morning drawn closer hides more than its tagline`);
  }
  return out;
}

async function checkStyles(browser, file) {
  const out = [];
  const sizes = { tall: { width: 390, height: 844 }, short: { width: 390, height: 700 }, narrow: { width: 360, height: 640 }, reduced: { width: 390, height: 844 } };
  for (const [size, viewport] of Object.entries(sizes)) {
    const page = await browser.newPage({ viewport });
    if (size === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: false })));
    await page.goto('file://' + path.resolve(file));
    await page.waitForSelector('#app *');
    // The app goes on drawing into its own element, taken off the page; the pieces are laid in a new, empty one.
    await page.evaluate(() => { const old = document.getElementById('app'); old.removeAttribute('id'); old.remove(); const app = document.createElement('div'); app.id = 'app'; document.body.prepend(app); });
    out.push(...await page.evaluate(readPieces, { pieces: PIECES, takings: TAKINGS, readable: READABLE, bare: BARE, size }));
    if (size === 'tall') out.push(...await page.evaluate(readRules));
    await page.close();
  }
  return out.map((x) => `styles: ${x}`);
}

module.exports = { checkStyles };
