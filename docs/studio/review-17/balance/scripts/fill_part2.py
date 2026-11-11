#!/usr/bin/env python3
"""Fills the last results into part2.md and part0.md and fixes wording."""
from pathlib import Path
lab = Path(__file__).parent

def edit(name, pairs):
    p = lab / name
    t = p.read_text()
    for old, new in pairs:
        assert old in t, f'{name}: {old[:70]!r}'
        t = t.replace(old, new)
    assert '@@' not in t, f'{name}: unfilled placeholder'
    p.write_text(t)

edit('part2.md', [
    ('@@N6_haggler@@', '+1.2'), ('@@N6_basket@@', '**-5.3**'), ('@@N6_bargain@@', '+2.6'), ('@@N6_charmer@@', '+1.3'),
    ('@@N6_favourite@@', '-1.5'), ('@@N6_nestegg@@', '+0.7'), ('@@N6_keeper@@', '-3.3'), ('@@N6_earful@@', '+4.3'),
    ('@@N6_max@@', '5.3'), ('@@N6_out@@', '2'),
    ('@@EAR2@@', '3 stalls -4.4 to **+2.3** (1,600 games), but 2 stalls -1.9 to +4.6. So the option that fits is "$1 at 2 stalls, $2 at 3 to 6" (move today\'s threshold from 4 stalls to 3). It pushes the Haggler and Big Basket to -4.7 and -4.8 at 3 stalls, so it is left out of the set.'),
    ('@@GUEST@@', '6 stalls, 50 positions, net per stall on the day: Superfood Trend -$0.71 to **+$1.75**, Mango Craze -$0.02 to +$2.37, Hotel Order -$0.97 to +$1.64, Kenduri -$1.11 to +$1.67, Bake-Off -$1.35 to +$1.57. Tourist Bus stays at $0.00.'),
    ('@@SOFT@@', '3 stalls, 1,000 games: less fruit is lost (blueberry 5.5% to 2.3%, mango 17.3% to 13.8%), Soft sales rise from 0.3-2% to 1-11% of each fruit, games with a stuck stall 3.6% to 2.4%, dead days 5.5% to 4.9%, average cash $86 to $88. Margins and fruit shares do not move (blowouts 47.6%).'),
    ('@@MEM@@', '**Yes, a lot.** A stall whose computer plans with rivals\' shelves blank (it remembers nothing it saw them buy) wins **22.8% instead of 31.8%** and ends **$9.91** poorer (+/- 1.21; 3 stalls, 500 games, same seeds). This is an upper bound for a person, who remembers some of it, but it is larger than any perk, and the shipped computer has this memory for free. Cheapest help without changing a rule: the app keeps a "what you saw them buy" note for each rival; on a table, allow pencil notes.'),
    ('@@FIRST@@', '**Yes, strongly, and the rules already use it well.** A seat that always buys first wins **58.4%** and ends $15.73 richer (+/- 1.9); a seat that always buys last wins **9.6%** and ends $21.36 poorer (+/- 1.5) (3 stalls, 500 games, same seeds). Because the poorest stall buys first, this is the game\'s main catch-up rule, and it is why winners buy first on fewer days. It also explains the 6-stall picture (last after day 5 wins 5.6%): with six in line the leaders see little of the lorry. One free Priority card, by contrast, measured -$0.91 +/- 0.83: the computer plays it on the first evening whether or not the next lorry matters.'),
    ('### 10.3 Checks that came out clean (no change proposed)', '### 10.3 Other checks'),
    ('| 1 | **Tip Jar.** *"A customer who leaves with their whole order tips you $1 if you sold them any of it, $2 if you served them alone."* (Today: $2, only when served alone.) | 3 stalls: 27.5% (-5.8) to 31.0% (-2.3).',
     '| 1 | **Tip Jar.** *"A customer who leaves with their whole order tips you $1 if you sold them any of it, $2 if you served them alone."* (Today: $2, only when served alone.) | 3 stalls: 27.5% (-5.8) to 31.0% (-2.3) (2,000 games, run together with Nest Egg $16 and a Haggler test change).'),
    ('| The deck never ran out in 8,400 games at 2 to 4 stalls (0.3% of 4-stall games) and the 18-card deck at 6 stalls is drawn 5.2 cards deep. |',
     '| The 12-card deck was reshuffled in 0.3% of 4-stall games and never at 2 or 3 stalls (8,400 games); the 18-card deck at 6 stalls is drawn 5.2 cards deep. |'),
    ('In ordinary games it would pay almost nothing, because it cannot be reached by buying fruit.',
     'By construction it pays only a stall with nothing on its shelf (0.4 to 0.9% of stall-days today), so it cannot be reached by buying fruit.'),
    ('| Games with a stuck stall | 3.6% | **0%** | 7.4% | **0%** | 2.7% | 0% |', '| Games with a stuck stall (0% by construction once the float is in) | 3.6% | **0%** | 7.4% | **0%** | 2.7% | 0% |'),
    ('| Mango\'s share of profit / profit per mango | 36% / $4.10 | 31% / $3.33 | 37% / $4.07 | | 34% / $4.06 | |', '| Mango\'s share of profit / profit per mango | 36% / $4.10 | 31% / $3.33 | 37% / $4.07 | 31% / $3.21 | 34% / $4.06 | |'),
])
p = lab / 'part2.md'
t = p.read_text()
t = t.replace("| Float handed out per stall per game | | $0.64 | | $0.86 | | |",
              "| Float handed out per stall per game | | $0.64 | | $0.86 | | |\n\nAt 6 stalls (500 games after): stuck stalls 13.2% of games to 0%, dead days 6.62% to 2.94%, last after day 5 wins 5.6% to 8.2%, median margin $17 to $14, blowouts 44.8% to 38.4%, average cash $79.8 to $76.1, float $1.19 a stall a game (41% of stalls get something). At 2 stalls (1,600 games): leader after day 5 wins 63.4% to 58.9%, median margin $22 to $20, blowouts 54.7% to 50.8%, average cash $92.4 to $88.5.")
p.write_text(t)

edit('part0.md', [
    ('About 75,000 all-computer games.', 'About 85,000 all-computer games, plus about 20,000 single days replayed for the event test.'),
    ('With the whole set the largest distance from a fair share falls from 10.4 to 4.4 points at 3 stalls, 8.6 to 5.8 at 2, 8.6 to 4.1 at 4 and 9.3 to 6.5 under Hard (SE about 2 each).',
     'With the whole set the largest distance from a fair share falls from 10.4 to 4.4 points at 3 stalls, 8.6 to 5.8 at 2, 8.6 to 4.1 at 4, 6.9 to 5.3 at 6 and 9.3 to 6.5 under Hard (SE about 2 each).'),
])
print('filled')
