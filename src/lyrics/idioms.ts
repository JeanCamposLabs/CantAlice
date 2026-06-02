/**
 * A small curated map of common English idioms → their real (figurative)
 * meaning in Portuguese. DeepL/Google translate these literally ("break a leg"
 * → "quebrar uma perna"), which is confusing for a learner, so the Tradutor
 * shows this note when the search matches a known expression.
 */
const IDIOMS: Record<string, string> = {
  'break a leg': 'Boa sorte! (deseja-se sucesso, geralmente antes de uma apresentação)',
  'piece of cake': 'Muito fácil; moleza.',
  'hit the road': 'Ir embora; cair na estrada.',
  'under the weather': 'Sentindo-se mal / meio doente.',
  'once in a blue moon': 'Muito raramente.',
  'spill the beans': 'Revelar um segredo; entregar o ouro.',
  'cost an arm and a leg': 'Ser muito caro; custar os olhos da cara.',
  'let the cat out of the bag': 'Revelar um segredo sem querer.',
  'a blessing in disguise': 'Algo ruim que acaba sendo bom; há males que vêm para bem.',
  'speak of the devil': 'Falando no diabo… (quando a pessoa de quem se falava aparece).',
  'the ball is in your court': 'A decisão é sua agora; a bola está com você.',
  'bite the bullet': 'Encarar algo difícil de uma vez; engolir o sapo.',
  'hit the sack': 'Ir dormir.',
  'call it a day': 'Encerrar o trabalho por hoje.',
  'on the same page': 'Estar de acordo / pensando a mesma coisa.',
  'pull someone’s leg': 'Brincar / pegar no pé de alguém.',
  "pull someone's leg": 'Brincar / pegar no pé de alguém.',
  'raining cats and dogs': 'Chovendo muito forte; chovendo canivete.',
  'cut to the chase': 'Ir direto ao ponto.',
  'butterflies in your stomach': 'Friozinho na barriga (nervosismo/ansiedade).',
  'over the moon': 'Muito feliz; nas nuvens.',
  'a piece of my mind': 'Dizer poucas e boas; falar o que pensa sem rodeios.',
  'break the ice': 'Quebrar o gelo; descontrair.',
  'no worries': 'Sem problema; relaxa.',
  'hang in there': 'Aguenta firme; não desista.',
  'head over heels': 'Perdidamente apaixonado(a).',
  'the last straw': 'A gota d’água.',
  'when pigs fly': 'No dia de São Nunca; nunca vai acontecer.',
  'get cold feet': 'Amarelar; ficar com medo de última hora.',
  'in a nutshell': 'Resumindo; em poucas palavras.',
  'kill two birds with one stone': 'Matar dois coelhos com uma cajadada só.',
}

/** Look up a phrase's idiomatic meaning, ignoring case/punctuation. Null if none. */
export function lookupIdiom(phrase: string): string | null {
  const key = phrase
    .toLowerCase()
    .trim()
    .replace(/[.!?,;:"]/g, '')
    .replace(/\s+/g, ' ')
  return IDIOMS[key] ?? null
}
