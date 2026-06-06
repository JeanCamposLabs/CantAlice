/**
 * "Situações" — a curated phrasebook of genuinely common, real-life English,
 * grouped by everyday scenario. Powers the Frases page: listen, practise saying
 * each line, shadow the mini-dialogues, and export a scenario straight to Anki.
 *
 * Portuguese is Brazilian (pt-BR). Phrases are kept natural and high-frequency —
 * the stuff you actually say, not textbook sentences.
 */
export interface Phrase {
  en: string
  pt: string
}
export interface DialogLine {
  who: 'you' | 'them'
  en: string
  pt: string
}
export interface Scenario {
  id: string
  emoji: string
  title: string
  blurb: string
  phrases: Phrase[]
  /** An optional realistic exchange to listen to and shadow line by line. */
  dialog?: DialogLine[]
}

export const PHRASEBOOK: Scenario[] = [
  {
    id: 'cafe',
    emoji: '☕',
    title: 'Café & Starbucks',
    blurb: 'Pedir seu café como um local — da próxima vez na Holanda. 😄',
    phrases: [
      { en: "Can I get a tall latte, please?", pt: 'Pode ser um latte pequeno (tall), por favor?' },
      { en: "I'd like a medium cappuccino.", pt: 'Eu queria um cappuccino médio.' },
      { en: 'Could I have it with oat milk?', pt: 'Poderia ser com leite de aveia?' },
      { en: 'Decaf, please.', pt: 'Sem cafeína, por favor.' },
      { en: 'Can I get an extra shot of espresso?', pt: 'Pode colocar uma dose extra de espresso?' },
      { en: 'Not too hot, please.', pt: 'Não muito quente, por favor.' },
      { en: 'For here, please. / To go, please.', pt: 'Para comer aqui. / Para viagem.' },
      { en: "What do you recommend?", pt: 'O que você recomenda?' },
      { en: 'Can I pay by card?', pt: 'Posso pagar no cartão?' },
      { en: 'Keep the change.', pt: 'Pode ficar com o troco.' },
    ],
    dialog: [
      { who: 'them', en: 'Hi! What can I get for you?', pt: 'Oi! O que você vai querer?' },
      { who: 'you', en: 'Can I get a tall latte, please?', pt: 'Pode ser um latte pequeno, por favor?' },
      { who: 'them', en: "Sure. What's the name for the order?", pt: 'Claro. Qual o nome do pedido?' },
      { who: 'you', en: "It's Maria.", pt: 'É Maria.' },
      { who: 'them', en: 'For here or to go?', pt: 'Para comer aqui ou para viagem?' },
      { who: 'you', en: 'To go, please.', pt: 'Para viagem, por favor.' },
      { who: 'them', en: 'Anything else?', pt: 'Mais alguma coisa?' },
      { who: 'you', en: "No, that's all. How much is it?", pt: 'Não, é só isso. Quanto fica?' },
      { who: 'them', en: "That'll be five forty.", pt: 'Dá cinco e quarenta.' },
      { who: 'you', en: 'Here you go. Thank you!', pt: 'Aqui está. Obrigada!' },
    ],
  },
  {
    id: 'greetings',
    emoji: '👋',
    title: 'Cumprimentos & papo',
    blurb: 'Quebrar o gelo e manter uma conversa leve.',
    phrases: [
      { en: 'Hi, how are you doing?', pt: 'Oi, como você está?' },
      { en: "I'm good, thanks. And you?", pt: 'Estou bem, obrigada. E você?' },
      { en: 'Nice to meet you.', pt: 'Prazer em conhecer você.' },
      { en: 'What do you do?', pt: 'O que você faz (de trabalho)?' },
      { en: 'Where are you from?', pt: 'De onde você é?' },
      { en: 'How was your weekend?', pt: 'Como foi seu fim de semana?' },
      { en: 'Sorry, could you say that again?', pt: 'Desculpa, pode repetir?' },
      { en: 'It was great talking to you.', pt: 'Foi ótimo falar com você.' },
      { en: 'Take care! See you soon.', pt: 'Se cuida! Até logo.' },
    ],
  },
  {
    id: 'restaurant',
    emoji: '🍽️',
    title: 'Restaurante',
    blurb: 'Da mesa à conta, sem travar.',
    phrases: [
      { en: 'A table for two, please.', pt: 'Uma mesa para dois, por favor.' },
      { en: 'Could we see the menu?', pt: 'Podemos ver o cardápio?' },
      { en: "What's the dish of the day?", pt: 'Qual é o prato do dia?' },
      { en: "I'll have the chicken, please.", pt: 'Vou querer o frango, por favor.' },
      { en: "I'm allergic to nuts.", pt: 'Eu sou alérgica a castanhas/nozes.' },
      { en: 'Can I have some water, please?', pt: 'Pode trazer água, por favor?' },
      { en: 'This is delicious!', pt: 'Está delicioso!' },
      { en: 'Could we get the check, please?', pt: 'Pode trazer a conta, por favor?' },
      { en: 'Can we split the bill?', pt: 'Dá para dividir a conta?' },
    ],
  },
  {
    id: 'shopping',
    emoji: '🛍️',
    title: 'Compras',
    blurb: 'Provar, escolher e pagar.',
    phrases: [
      { en: "I'm just looking, thanks.", pt: 'Só estou dando uma olhada, obrigada.' },
      { en: 'How much is this?', pt: 'Quanto custa isto?' },
      { en: 'Do you have this in a smaller size?', pt: 'Você tem isto num tamanho menor?' },
      { en: 'Can I try it on?', pt: 'Posso experimentar?' },
      { en: 'Where are the fitting rooms?', pt: 'Onde ficam os provadores?' },
      { en: "I'll take it.", pt: 'Vou levar.' },
      { en: 'Do you accept cards?', pt: 'Vocês aceitam cartão?' },
      { en: 'Can I get a receipt, please?', pt: 'Pode me dar o recibo, por favor?' },
    ],
  },
  {
    id: 'directions',
    emoji: '🧭',
    title: 'Direções & transporte',
    blurb: 'Se achar na cidade e se virar no transporte.',
    phrases: [
      { en: 'Excuse me, how do I get to the station?', pt: 'Com licença, como chego à estação?' },
      { en: 'Is it far from here?', pt: 'É longe daqui?' },
      { en: 'Is this the right way to the museum?', pt: 'É por aqui o caminho para o museu?' },
      { en: 'Which platform is it?', pt: 'Qual é a plataforma?' },
      { en: 'A ticket to the city center, please.', pt: 'Uma passagem para o centro, por favor.' },
      { en: 'Does this bus go downtown?', pt: 'Este ônibus vai para o centro?' },
      { en: 'Could you tell me when to get off?', pt: 'Pode me avisar onde descer?' },
      { en: "I think I'm lost.", pt: 'Acho que me perdi.' },
    ],
  },
  {
    id: 'travel',
    emoji: '✈️',
    title: 'Aeroporto & hotel',
    blurb: 'Check-in, embarque e hospedagem.',
    phrases: [
      { en: "I'd like to check in, please.", pt: 'Eu gostaria de fazer o check-in, por favor.' },
      { en: 'Here is my passport.', pt: 'Aqui está meu passaporte.' },
      { en: 'Just one carry-on.', pt: 'Só uma bagagem de mão.' },
      { en: 'Which gate is my flight?', pt: 'Qual é o portão do meu voo?' },
      { en: 'I have a reservation under Maria.', pt: 'Tenho uma reserva no nome de Maria.' },
      { en: 'What time is check-out?', pt: 'Que horas é o check-out?' },
      { en: 'Is breakfast included?', pt: 'O café da manhã está incluído?' },
      { en: 'Could I have the Wi-Fi password?', pt: 'Pode me passar a senha do Wi-Fi?' },
    ],
  },
  {
    id: 'help',
    emoji: '🆘',
    title: 'Ajuda & imprevistos',
    blurb: 'Para quando algo sai do plano.',
    phrases: [
      { en: 'Can you help me, please?', pt: 'Você pode me ajudar, por favor?' },
      { en: "I don't understand.", pt: 'Eu não entendi.' },
      { en: 'Could you speak more slowly?', pt: 'Você pode falar mais devagar?' },
      { en: 'How do you say this in English?', pt: 'Como se diz isto em inglês?' },
      { en: "I've lost my phone.", pt: 'Eu perdi meu celular.' },
      { en: 'Where is the nearest pharmacy?', pt: 'Onde fica a farmácia mais próxima?' },
      { en: "I'm not feeling well.", pt: 'Não estou me sentindo bem.' },
      { en: 'Thank you so much for your help.', pt: 'Muito obrigada pela ajuda.' },
    ],
  },
]
