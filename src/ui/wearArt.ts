// Pixel rows for the things a shopkeeper can wear (see looks.ts). They are laid over the 16 x 16 portrait in
// src/ui/pixel.tsx, row 0 at the top, '.' is see-through. The letters use the portrait's own palette:
// Y gold, T tan, B brown, R red, G green, W cream, K ink, V pink, O orange.
// The head fills rows 4 to 13, the eyes sit on row 9 (columns 5 and 10) and the shoulders are rows 14 and 15.
export const WEAR_PARTS: Record<string, string[]> = {
  straw_boater: ['', '', '....TTTTTTTT....', '....TTTTTTTT....', '....RRRRRRRR....', '..TTTTTTTTTTTT..'],
  fruit_basket_hat: ['.......G........', '......RRR.......', '....TTTTTTTT....', '...TBTBTBTBTT...', '...TTTTTTTTTT...', '..TTTTTTTTTTTT..'],
  party_hat: ['.......YY.......', '.......RR.......', '......RWWR......', '.....RRRRRR.....', '....RWWRRWWR....', '...RRRRRRRRRR...'],
  laurel: ['', '', '', '..G.GGGGGGGG.G..', '..GG........GG..', '..GG........GG..', '..G..........G..'],
  gold_crown: ['', '', '....Y..YY..Y....', '....YY.YY.YY....', '....YYYYYYYY....', '....YRYYYYRY....'],
  monocle: ['', '', '', '', '', '', '', '', '.........YYY....', '.........Y.Y....', '.........YYY....', '............Y...', '............Y...'],
  bow_tie: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '.....RRYYRR.....', '.....RR..RR.....'],
  scarf: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '....RWRWRWRW....', '..RWRWRWRWRWRW..'],
  apron: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '....WW....WW....', '..WWWWWWWWWWWW..'],
  sash: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '....YYY.........', '..YYYYYYYYYY....'],
  medal: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '.....R....R.....', '......RYYR......'],
};
