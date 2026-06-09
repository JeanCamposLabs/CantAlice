/**
 * "Situações" — a curated phrasebook of genuinely common, real-life English,
 * grouped by everyday scenario. Powers the Frases page: listen, practise saying
 * each line, shadow the mini-dialogues, and export a scenario straight to Anki.
 *
 * Portuguese is Brazilian (pt-BR). Phrases are kept natural and high-frequency —
 * the stuff you actually say, not textbook sentences. `en` holds the
 * target-language phrase (English or Spanish); `pt` is always the translation.
 */
import type { TargetLang } from '../config'

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

const EN: Scenario[] = [
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
    dialog: [
      { who: 'them', en: "Hey! Are you new here?", pt: 'Ei! Você é novo/a por aqui?' },
      { who: 'you', en: 'Yes, I just moved here last week.', pt: 'Sim, me mudei aqui semana passada.' },
      { who: 'them', en: "Oh, welcome! Where are you from?", pt: 'Oh, bem-vindo/a! De onde você é?' },
      { who: 'you', en: "I'm from Brazil. What about you?", pt: 'Sou do Brasil. E você?' },
      { who: 'them', en: "I'm from here, actually. How are you liking it so far?", pt: 'Sou daqui, na verdade. Como está achando até agora?' },
      { who: 'you', en: "I love it! Everyone is so friendly.", pt: 'Estou adorando! Todo mundo é muito simpático.' },
      { who: 'them', en: "That's great to hear. Have you tried the coffee shop around the corner?", pt: 'Que bom. Você já experimentou o café da esquina?' },
      { who: 'you', en: "Not yet. Is it good?", pt: 'Ainda não. É bom?' },
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
    dialog: [
      { who: 'them', en: 'Good evening! Do you have a reservation?', pt: 'Boa noite! Vocês têm reserva?' },
      { who: 'you', en: "No, we don't. Do you have a table for two?", pt: 'Não, não temos. Vocês têm mesa para dois?' },
      { who: 'them', en: "Sure, right this way. Here's your menu.", pt: 'Claro, por aqui. Aqui está o cardápio.' },
      { who: 'you', en: 'Thank you. What do you recommend today?', pt: 'Obrigada. O que você recomenda hoje?' },
      { who: 'them', en: 'The salmon is excellent tonight.', pt: 'O salmão está excelente esta noite.' },
      { who: 'you', en: "Great, I'll have the salmon, please.", pt: 'Ótimo, vou querer o salmão, por favor.' },
      { who: 'them', en: 'Of course. And to drink?', pt: 'Claro. E para beber?' },
      { who: 'you', en: "Just water, please. Could we get the check when you're ready?", pt: 'Só água, por favor. Pode trazer a conta quando puder?' },
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
    dialog: [
      { who: 'them', en: 'Hi there! Can I help you find anything?', pt: 'Oi! Posso te ajudar a encontrar algo?' },
      { who: 'you', en: "I'm just looking, thanks.", pt: 'Só estou dando uma olhada, obrigada.' },
      { who: 'them', en: 'Of course. Let me know if you need any help.', pt: 'Claro. Me fale se precisar de ajuda.' },
      { who: 'you', en: 'Actually, how much is this jacket?', pt: 'Na verdade, quanto custa essa jaqueta?' },
      { who: 'them', en: "That one is eighty-nine dollars.", pt: 'Essa aí é oitenta e nove dólares.' },
      { who: 'you', en: 'Do you have it in a smaller size?', pt: 'Você tem num tamanho menor?' },
      { who: 'them', en: "Let me check... Yes, here you go.", pt: 'Deixa eu verificar... Sim, aqui está.' },
      { who: 'you', en: "Perfect, I'll take it. Do you accept cards?", pt: 'Perfeito, vou levar. Vocês aceitam cartão?' },
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
    dialog: [
      { who: 'them', en: "Good morning! Where are you flying to today?", pt: 'Bom dia! Para onde você vai viajar hoje?' },
      { who: 'you', en: "I'm flying to London. I'd like to check in, please.", pt: 'Vou para Londres. Gostaria de fazer o check-in, por favor.' },
      { who: 'them', en: "Of course. May I see your passport?", pt: 'Claro. Posso ver seu passaporte?' },
      { who: 'you', en: "Here you go.", pt: 'Aqui está.' },
      { who: 'them', en: "Any bags to check in?", pt: 'Alguma bagagem para despachar?' },
      { who: 'you', en: "Just one suitcase. And I have a carry-on.", pt: 'Só uma mala. E tenho uma bagagem de mão.' },
      { who: 'them', en: "Your seat is 14A. Gate B12, boarding at ten thirty.", pt: 'Seu assento é 14A. Portão B12, embarque às 10h30.' },
      { who: 'you', en: "Thank you! Which way is the gate?", pt: 'Obrigada! Por onde fica o portão?' },
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

// Castilian Spanish (Spain). `en` holds the Spanish phrase; `pt` the translation.
const ES: Scenario[] = [
  {
    id: 'cafe',
    emoji: '☕',
    title: 'Café & Starbucks',
    blurb: 'Pedir tu café como un local. 😄',
    phrases: [
      { en: 'Un café con leche, por favor.', pt: 'Um café com leite, por favor.' },
      { en: '¿Me pones un cortado?', pt: 'Pode me trazer um cortado (café com pouco leite)?' },
      { en: 'Quería un café solo.', pt: 'Eu queria um café puro (expresso).' },
      { en: '¿Lo tienes con leche de avena?', pt: 'Você tem com leite de aveia?' },
      { en: 'Sin azúcar, por favor.', pt: 'Sem açúcar, por favor.' },
      { en: 'Para tomar aquí. / Para llevar.', pt: 'Para tomar aqui. / Para viagem.' },
      { en: '¿Qué me recomiendas?', pt: 'O que você me recomenda?' },
      { en: '¿Puedo pagar con tarjeta?', pt: 'Posso pagar com cartão?' },
      { en: 'Quédate con el cambio.', pt: 'Pode ficar com o troco.' },
    ],
    dialog: [
      { who: 'them', en: '¡Hola! ¿Qué te pongo?', pt: 'Olá! O que vai querer?' },
      { who: 'you', en: 'Un café con leche, por favor.', pt: 'Um café com leite, por favor.' },
      { who: 'them', en: '¿Para tomar aquí o para llevar?', pt: 'Para tomar aqui ou para viagem?' },
      { who: 'you', en: 'Para llevar, por favor.', pt: 'Para viagem, por favor.' },
      { who: 'them', en: '¿Algo más?', pt: 'Mais alguma coisa?' },
      { who: 'you', en: 'No, eso es todo. ¿Cuánto es?', pt: 'Não, é só isso. Quanto fica?' },
      { who: 'them', en: 'Son dos con cuarenta.', pt: 'Dá dois e quarenta.' },
      { who: 'you', en: 'Aquí tienes. ¡Gracias!', pt: 'Aqui está. Obrigada!' },
    ],
  },
  {
    id: 'greetings',
    emoji: '👋',
    title: 'Saludos & charla',
    blurb: 'Romper o gelo e manter uma conversa leve.',
    phrases: [
      { en: 'Hola, ¿qué tal?', pt: 'Oi, tudo bem?' },
      { en: 'Muy bien, gracias. ¿Y tú?', pt: 'Muito bem, obrigada. E você?' },
      { en: 'Encantada de conocerte.', pt: 'Prazer em conhecer você.' },
      { en: '¿A qué te dedicas?', pt: 'O que você faz (de trabalho)?' },
      { en: '¿De dónde eres?', pt: 'De onde você é?' },
      { en: '¿Qué tal el fin de semana?', pt: 'Como foi o fim de semana?' },
      { en: 'Perdona, ¿puedes repetir?', pt: 'Desculpa, pode repetir?' },
      { en: 'Me ha encantado hablar contigo.', pt: 'Adorei falar com você.' },
      { en: '¡Cuídate! Hasta pronto.', pt: 'Se cuida! Até logo.' },
    ],
    dialog: [
      { who: 'them', en: '¡Hola! ¿Eres nuevo/a por aquí?', pt: 'Oi! Você é novo/a por aqui?' },
      { who: 'you', en: 'Sí, me mudé aquí la semana pasada.', pt: 'Sim, me mudei aqui semana passada.' },
      { who: 'them', en: '¡Bienvenido/a! ¿De dónde eres?', pt: 'Bem-vindo/a! De onde você é?' },
      { who: 'you', en: 'Soy de Brasil. ¿Y tú?', pt: 'Sou do Brasil. E você?' },
      { who: 'them', en: 'Yo soy de aquí. ¿Qué tal te está gustando?', pt: 'Eu sou daqui. O que você está achando?' },
      { who: 'you', en: '¡Me encanta! Todos son muy simpáticos.', pt: 'Estou adorando! Todos são muito simpáticos.' },
      { who: 'them', en: 'Me alegra. ¿Has probado la cafetería de la esquina?', pt: 'Que bom. Você já experimentou o café da esquina?' },
      { who: 'you', en: 'Todavía no. ¿Está buena?', pt: 'Ainda não. É bom?' },
    ],
  },
  {
    id: 'restaurant',
    emoji: '🍽️',
    title: 'Restaurante',
    blurb: 'Da mesa à conta, sem travar.',
    phrases: [
      { en: 'Una mesa para dos, por favor.', pt: 'Uma mesa para dois, por favor.' },
      { en: '¿Nos trae la carta?', pt: 'Pode trazer o cardápio?' },
      { en: '¿Cuál es el plato del día?', pt: 'Qual é o prato do dia?' },
      { en: 'Para mí el pollo, por favor.', pt: 'Para mim o frango, por favor.' },
      { en: 'Soy alérgica a los frutos secos.', pt: 'Sou alérgica a castanhas/nozes.' },
      { en: '¿Me trae un poco de agua?', pt: 'Pode trazer um pouco de água?' },
      { en: '¡Está buenísimo!', pt: 'Está uma delícia!' },
      { en: 'La cuenta, por favor.', pt: 'A conta, por favor.' },
      { en: '¿Podemos pagar a medias?', pt: 'Dá para dividir a conta?' },
    ],
    dialog: [
      { who: 'them', en: '¡Buenas noches! ¿Tienen reserva?', pt: 'Boa noite! Vocês têm reserva?' },
      { who: 'you', en: 'No, no tenemos. ¿Tienen mesa para dos?', pt: 'Não, não temos. Têm mesa para dois?' },
      { who: 'them', en: 'Claro, por aquí. Aquí tienen la carta.', pt: 'Claro, por aqui. Aqui está o cardápio.' },
      { who: 'you', en: 'Gracias. ¿Qué nos recomienda?', pt: 'Obrigada. O que nos recomenda?' },
      { who: 'them', en: 'El salmón está muy bueno esta noche.', pt: 'O salmão está muito bom esta noite.' },
      { who: 'you', en: 'Perfecto, para mí el salmón, por favor.', pt: 'Perfeito, para mim o salmão, por favor.' },
      { who: 'them', en: '¿Y para beber?', pt: 'E para beber?' },
      { who: 'you', en: 'Solo agua, por favor. Y la cuenta cuando pueda.', pt: 'Só água, por favor. E a conta quando puder.' },
    ],
  },
  {
    id: 'shopping',
    emoji: '🛍️',
    title: 'Compras',
    blurb: 'Provar, escolher e pagar.',
    phrases: [
      { en: 'Solo estoy mirando, gracias.', pt: 'Só estou dando uma olhada, obrigada.' },
      { en: '¿Cuánto cuesta esto?', pt: 'Quanto custa isto?' },
      { en: '¿Lo tienes en una talla más pequeña?', pt: 'Você tem num tamanho menor?' },
      { en: '¿Me lo puedo probar?', pt: 'Posso experimentar?' },
      { en: '¿Dónde están los probadores?', pt: 'Onde ficam os provadores?' },
      { en: 'Me lo llevo.', pt: 'Vou levar.' },
      { en: '¿Aceptan tarjeta?', pt: 'Vocês aceitam cartão?' },
      { en: '¿Me da el recibo, por favor?', pt: 'Pode me dar o recibo, por favor?' },
    ],
    dialog: [
      { who: 'them', en: '¡Hola! ¿Le puedo ayudar en algo?', pt: 'Olá! Posso te ajudar com algo?' },
      { who: 'you', en: 'No, solo estoy mirando, gracias.', pt: 'Não, só estou olhando, obrigada.' },
      { who: 'them', en: 'Claro. Si necesita algo, me dice.', pt: 'Claro. Se precisar de algo, me diz.' },
      { who: 'you', en: '¿Cuánto cuesta esta chaqueta?', pt: 'Quanto custa essa jaqueta?' },
      { who: 'them', en: 'Cuesta ochenta y nueve euros.', pt: 'Custa oitenta e nove euros.' },
      { who: 'you', en: '¿La tiene en una talla más pequeña?', pt: 'Tem num tamanho menor?' },
      { who: 'them', en: 'Déjeme ver... Sí, aquí tiene.', pt: 'Deixa eu ver... Sim, aqui está.' },
      { who: 'you', en: 'Perfecto, me la llevo. ¿Aceptan tarjeta?', pt: 'Perfeito, vou levar. Aceitam cartão?' },
    ],
  },
  {
    id: 'directions',
    emoji: '🧭',
    title: 'Direcciones & transporte',
    blurb: 'Se achar na cidade e se virar no transporte.',
    phrases: [
      { en: 'Perdona, ¿cómo llego a la estación?', pt: 'Com licença, como chego à estação?' },
      { en: '¿Está lejos de aquí?', pt: 'É longe daqui?' },
      { en: '¿Es este el camino al museo?', pt: 'É por aqui o caminho para o museu?' },
      { en: '¿Qué andén es?', pt: 'Qual é a plataforma?' },
      { en: 'Un billete para el centro, por favor.', pt: 'Uma passagem para o centro, por favor.' },
      { en: '¿Este autobús va al centro?', pt: 'Este ônibus vai para o centro?' },
      { en: '¿Me avisa cuándo bajar?', pt: 'Pode me avisar onde descer?' },
      { en: 'Creo que me he perdido.', pt: 'Acho que me perdi.' },
    ],
  },
  {
    id: 'travel',
    emoji: '✈️',
    title: 'Aeropuerto & hotel',
    blurb: 'Check-in, embarque e hospedagem.',
    phrases: [
      { en: 'Quería facturar, por favor.', pt: 'Eu queria fazer o check-in (da bagagem), por favor.' },
      { en: 'Aquí tiene mi pasaporte.', pt: 'Aqui está meu passaporte.' },
      { en: 'Solo llevo equipaje de mano.', pt: 'Só levo bagagem de mão.' },
      { en: '¿De qué puerta sale mi vuelo?', pt: 'De qual portão sai meu voo?' },
      { en: 'Tengo una reserva a nombre de María.', pt: 'Tenho uma reserva no nome de María.' },
      { en: '¿A qué hora es la salida?', pt: 'Que horas é o check-out?' },
      { en: '¿El desayuno está incluido?', pt: 'O café da manhã está incluído?' },
      { en: '¿Me da la contraseña del wifi?', pt: 'Pode me passar a senha do Wi-Fi?' },
    ],
    dialog: [
      { who: 'them', en: '¡Buenos días! ¿A dónde viaja hoy?', pt: 'Bom dia! Para onde viaja hoje?' },
      { who: 'you', en: 'Vuelo a Madrid. Quería facturar, por favor.', pt: 'Vou para Madri. Gostaria de fazer o check-in, por favor.' },
      { who: 'them', en: 'Claro. ¿Me enseña el pasaporte?', pt: 'Claro. Pode me mostrar o passaporte?' },
      { who: 'you', en: 'Aquí tiene.', pt: 'Aqui está.' },
      { who: 'them', en: '¿Tiene equipaje para facturar?', pt: 'Tem bagagem para despachar?' },
      { who: 'you', en: 'Solo una maleta. Y llevo equipaje de mano.', pt: 'Só uma mala. E levo bagagem de mão.' },
      { who: 'them', en: 'Su asiento es el 14A. Puerta B12, embarque a las diez y media.', pt: 'Seu assento é o 14A. Portão B12, embarque às 10h30.' },
      { who: 'you', en: '¡Gracias! ¿Por dónde se va a la puerta?', pt: 'Obrigada! Por onde fica o portão?' },
    ],
  },
  {
    id: 'help',
    emoji: '🆘',
    title: 'Ayuda & imprevistos',
    blurb: 'Para quando algo sai do plano.',
    phrases: [
      { en: '¿Me puedes ayudar, por favor?', pt: 'Você pode me ajudar, por favor?' },
      { en: 'No entiendo.', pt: 'Eu não entendi.' },
      { en: '¿Puedes hablar más despacio?', pt: 'Você pode falar mais devagar?' },
      { en: '¿Cómo se dice esto en español?', pt: 'Como se diz isto em espanhol?' },
      { en: 'He perdido el móvil.', pt: 'Eu perdi o celular.' },
      { en: '¿Dónde está la farmacia más cercana?', pt: 'Onde fica a farmácia mais próxima?' },
      { en: 'No me encuentro bien.', pt: 'Não estou me sentindo bem.' },
      { en: 'Muchas gracias por tu ayuda.', pt: 'Muito obrigada pela ajuda.' },
    ],
  },
]

export const PHRASEBOOKS: Record<TargetLang, Scenario[]> = { en: EN, es: ES }
