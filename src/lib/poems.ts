import { EmotionType } from "./emotions";

const poems: Record<EmotionType, string[]> = {
  happy: [
    "Puedo escribir los versos mas felices esta noche. Pensar que la alegria no se acaba, que el corazon se llena de luz como un jardin en primavera.",
    "Me gustas cuando ries porque ries con el alma, porque el mundo se ilumina cuando tu sonrisa estalla como un fuego de artificio en la noche.",
    "Hoy la alegria viene a visitarme, se sienta junto a mi y me recuerda que la vida es un regalo que se abre cada manana con la luz del sol.",
    "Celebro la alegria de estar vivo, de sentir el latido del mundo en cada paso, de saber que este instante es un tesoro irrepetible.",
  ],
  sad: [
    "Poema 20: Puedo escribir los versos mas tristes esta noche. Pensar que no la tengo. Sentir que la he perdido. Oir la noche inmensa, mas inmensa sin ella.",
    "No te rindas, aun estas a tiempo de alcanzar y comenzar de nuevo, aceptar tus sombras, enterrar tus miedos, liberar el lastre, retomar el vuelo.",
    "La tristeza es un muro entre dos jardines. De un lado crece el recuerdo, del otro la esperanza. Ambos necesitan lluvia para florecer.",
    "Hay dias en que somos tan lugubres, tan lugubres, como en las tardes pardas del otono en que caen las hojas muertas de los arboles.",
  ],
  angry: [
    "Y la rabia es un fuego que transforma, que no destruye sino que forja. Como el hierro en la fragua, el alma se templa en la intensidad del sentir.",
    "No vayas con tu fuego a quemar el mundo. Guarda la llama para iluminar los caminos oscuros que aun te quedan por recorrer.",
    "La furia del viento no destruye la montana, solo le da forma. Asi la emocion intensa nos esculpe por dentro y nos hace mas fuertes.",
    "Que la tormenta pase, que el cielo se despeje. Detras de cada nube oscura hay un sol esperando para volver a brillar.",
  ],
  surprised: [
    "La vida te sorprende como un verso inesperado, como una puerta que se abre donde solo habia muro, como un amanecer que nadie habia anunciado.",
    "Hay un instante en que todo se detiene, los ojos se abren grandes como ventanas al asombro y el mundo vuelve a ser nuevo como el primer dia.",
    "Que extrano es todo esto. Que hermoso es sorprenderse. Que maravilloso es saber que aun hay cosas que pueden dejarnos sin palabras.",
    "El universo conspira en momentos de asombro, nos recuerda que somos pequenos ante la inmensidad de lo posible.",
  ],
  disgusted: [
    "A veces el alma necesita sacudirse, como un arbol en otono que deja caer lo que ya no le sirve para hacer espacio a lo nuevo.",
    "No todo lo que brilla es oro, dice el sabio. Aprender a reconocer lo que no nos nutre es el primer paso hacia lo que verdaderamente nos alimenta.",
    "Hay verdades amargas que sanan, como la medicina que no sabe bien pero cura. El disgusto es a veces el guardian de nuestros valores.",
    "Rechazar lo que dana es un acto de amor propio. Como el mar devuelve a la orilla lo que no le pertenece.",
  ],
  fearful: [
    "El miedo es solo una puerta cerrada. Al otro lado hay un jardin que espera. Solo necesitas la llave del coraje para abrirla.",
    "Teme, pero avanza. El valiente no es quien no siente miedo, sino quien camina a pesar de el, paso a paso, hacia la luz.",
    "En la oscuridad del miedo nacen las estrellas mas brillantes. No huyas de la noche, aprende a encontrar la luz que llevas dentro.",
    "Todos los miedos se hacen pequenos cuando los miras de frente. Son gigantes de papel que se deshacen con la primera gota de valentia.",
  ],
  neutral: [
    "La calma es un rio profundo que fluye sin prisa. En su superficie se refleja el cielo entero, y en su fondo descansan todas las respuestas.",
    "Hay una paz que habita en el silencio, una serenidad que no necesita palabras. Es el arte de simplemente ser, sin mas.",
    "Como el agua en reposo que refleja las estrellas, la mente serena es capaz de ver con claridad lo que el ruido oculta.",
    "En la quietud del momento presente se esconde toda la sabiduria del universo. Solo hay que detenerse a escuchar.",
  ],
};

export function getRandomPoem(emotion: EmotionType): string {
  const emotionPoems = poems[emotion];
  return emotionPoems[Math.floor(Math.random() * emotionPoems.length)];
}
