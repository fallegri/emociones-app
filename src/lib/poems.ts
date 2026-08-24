import { EmotionType } from "./emotions";

const poems: Record<EmotionType, string[]> = {
  happy: [
    "Bajo el sol cruceno florece la alegria, entre cusi y motacu el alma camba baila. Los llanos se visten de fiesta y los rios cantan coplas de carnaval.",
    "En el carnaval cruceno la vida es pura dicha, se escuchan taquiraris al ritmo del tamborito. La tierra camba celebra con el corazon abierto y el monte se llena de risas bajo el cielo infinito.",
    "Alegre como el tucancillo que vuela sobre el Pirai, asi canta el corazon cuando la tierra esta en flor. Santa Cruz de la Sierra, tierra de sol y esperanza, donde la felicidad brota como el tajibo en septiembre.",
    "Que lindo es ser camba, que lindo es sentir el viento calido del oriente acariciar la piel. Los tajibos rosados pintan la ciudad de fiesta y en cada esquina suena un tamborita de miel.",
  ],
  sad: [
    "El rio Grande se lleva mis penas aguas abajo, como las hojas del bibosi que caen sin consuelo. La pampa esta callada, el viento ya no silba, solo queda el recuerdo de tardes junto al fuego.",
    "Triste como garza sola en los banados del Beni, asi se siente el alma cuando el monte esta en silencio. Ni el canto del serenere consuela la nostalgia de las tardes que se fueron por el rio Mamore.",
    "Se fue la lluvia y dejo el barro de la ausencia, el camino al pueblo se borro como un recuerdo. En los llanos del oriente la soledad es inmensa cuando se extrana la tierra que nos vio nacer primero.",
    "Como el jichi que llora en las noches de luna llena, asi llora el alma camba lejos de su querencia. Los palmares de Pando guardan ecos de tristeza cuando el viento trae memorias de una antigua pertenencia.",
  ],
  angry: [
    "Con la fuerza del surubi que rompe la corriente, asi se levanta el camba cuando la injusticia crece. La tierra del oriente no se arrodilla ante nadie, como el cedro en la tormenta, de pie permanece.",
    "Truena el cielo del Chaco como truena la sangre camba cuando la dignidad se pisa y la verdad se calla. Ni el viento del norte tumba al cusi centenario, ni hay fuerza que doblegue al que defiende lo suyo.",
    "Como el jaguar que ruge en las noches del Amboro, asi ruge el oriente cuando lo quieren callar. La furia del rio Yapacani en tiempo de crecida es nada comparada con un pueblo al despertar.",
    "Arde la chaquena como arde la rabia contenida, pero el fuego del camba no destruye, transforma. Como la tierra quemada que vuelve a dar cosecha, de la furia nace fuerza para construir de forma.",
  ],
  surprised: [
    "Se abrio el monte y aparecio un arcoiris sobre el Urubo, como aparece la vida cuando menos la esperamos. El oriente guarda secretos entre ceibos y palmares, sorpresas que el destino va sembrando en nuestros pasos.",
    "Como encontrar orquideas silvestres en la serrania, asi es la sorpresa de un amanecer camba. El Pirai crece de golpe con las lluvias de noviembre y todo se transforma en esta tierra encantada.",
    "Que asombro el vuelo de los parabas sobre el rio Blanco, que maravilla la luna reflejada en la laguna. El oriente boliviano no deja de sorprendernos con cada amanecer pintado de colores de acuarela.",
    "De pronto canta el yasiyatere en medio de la siesta y el monte se despierta con un nuevo resplandor. Asi es la vida en el oriente, llena de misterios, cada recodo del camino guarda una revelacion.",
  ],
  disgusted: [
    "No todo es miel de cana en estos llanos verdes, a veces el rio trae aguas turbias desde lejos. Como el olor del cuchi cuando el pantano crece, hay cosas que el oriente necesita dejar atras.",
    "El bibosi que ahoga al arbol que lo sostiene nos recuerda que hay abrazos que en verdad son prisiones. La tierra camba es sabia y sabe distinguir entre lo que la nutre y lo que envenena sus raices.",
    "Ni el peni mas viejo come frutas podridas del monte, ni el camba de ley acepta lo que dana su tierra. Como el rio rechaza lo que no le pertenece, el oriente escupe aquello que no merece su nombre.",
    "Hay males que llegan como plaga de langosta al campo, cubriendo de amargura lo que antes era verde. Pero la tierra camba se sacude las plagas y vuelve a florecer con la primera lluvia nueva.",
  ],
  fearful: [
    "En las noches sin luna del monte chapacureno el jichi silba y el alma tiembla como hoja de ambaibo. Pero el camba sabe que despues de cada sombra la luz del alba cruza los palmares con su abrazo.",
    "Crece el rio, crece el miedo, crece la incertidumbre cuando el Mamore desborda y se lleva la esperanza. Pero el beniano sabe construir de nuevo porque su coraje es mas grande que cualquier crecida.",
    "Como el monte oscuro que asusta al caminante cuando cae la noche y se pierden los senderos, asi a veces el miedo nos envuelve en su neblina. Pero el camba conoce las estrellas que lo guian.",
    "Tiembla el suelo cuando el rio baja con su furia y el corazon se encoge ante la fuerza del agua. Pero esta tierra enseno a su gente a ser valiente, como la palma que se dobla pero nunca se quiebra.",
  ],
  neutral: [
    "El rio fluye en calma por los llanos del oriente, como fluyen los dias bajo el cielo beniano. En la paz de la siesta el monte respira suave y todo encuentra su lugar en esta tierra serena.",
    "Ni triste ni alegre, el camba mira el horizonte donde los llanos se funden con el cielo en una linea. Como el motacu que espera paciente la estacion, asi la calma del oriente tiene su propia belleza.",
    "La hamaca se mece sola con el viento del norte, el tereré se enfria despacio en la tarde quieta. Santa Cruz descansa entre sus anillos verdes con la serenidad de quien conoce su destino.",
    "Como el agua mansa de la laguna Concepcion que refleja nubes sin prisa ni preocupacion, asi esta el alma cuando encuentra su equilibrio en la quietud sagrada del oriente boliviano.",
  ],
};

export function getRandomPoem(emotion: EmotionType): string {
  const emotionPoems = poems[emotion];
  return emotionPoems[Math.floor(Math.random() * emotionPoems.length)];
}
